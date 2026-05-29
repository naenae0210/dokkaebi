package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"hangwith/api/internal/model"
)

type CardRepo struct {
	db *sqlx.DB
}

func NewCardRepo(db *sqlx.DB) *CardRepo {
	return &CardRepo{db: db}
}

func (r *CardRepo) List(ctx context.Context, currentUserID *string, limit, offset int, cityID, category *string) ([]model.Card, int, error) {
	args := []any{}
	argIdx := 1
	where := ""

	if cityID != nil {
		where += fmt.Sprintf(" AND c.city_id = $%d", argIdx)
		args = append(args, *cityID)
		argIdx++
	}
	if category != nil {
		where += fmt.Sprintf(" AND c.category = $%d", argIdx)
		args = append(args, *category)
		argIdx++
	}

	var total int
	if err := r.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM cards c WHERE 1=1%s", where),
		args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT c.id, c.user_id, c.city_id, c.category, c.title, c.cover_photo_id,
		       c.visibility, c.sort_order, c.created_at, c.updated_at,
		       u.nickname AS owner_nickname
		FROM cards c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE 1=1%s
		ORDER BY NULLIF(c.sort_order, 0) ASC NULLS LAST, c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	var cards []model.Card
	if err := r.db.SelectContext(ctx, &cards, query, args...); err != nil {
		return nil, 0, err
	}
	if len(cards) == 0 {
		return []model.Card{}, total, nil
	}

	cardIDs := make([]string, len(cards))
	cityIDSet := map[string]struct{}{}
	for i, c := range cards {
		cardIDs[i] = c.ID
		if c.CityID != nil {
			cityIDSet[*c.CityID] = struct{}{}
		}
	}

	if len(cityIDSet) > 0 {
		cityIDs := make([]string, 0, len(cityIDSet))
		for id := range cityIDSet {
			cityIDs = append(cityIDs, id)
		}
		var cities []model.City
		if err := r.db.SelectContext(ctx, &cities,
			`SELECT * FROM cities WHERE id = ANY($1)`,
			pq.Array(cityIDs),
		); err != nil {
			return nil, 0, err
		}
		cityMap := make(map[string]model.City, len(cities))
		for _, c := range cities {
			cityMap[c.ID] = c
		}
		for i := range cards {
			if cards[i].CityID != nil {
				if city, ok := cityMap[*cards[i].CityID]; ok {
					c := city
					cards[i].City = &c
				}
			}
		}
	}

	var places []model.Place
	if err := r.db.SelectContext(ctx, &places,
		`SELECT * FROM places WHERE card_id = ANY($1) ORDER BY sort_order`,
		pq.Array(cardIDs),
	); err != nil {
		return nil, 0, err
	}

	// bulk load photos — top 4 per card + total count via window function
	// private photos only visible to the card owner
	type photoRow struct {
		model.Photo
		TotalCount int `db:"total_count"`
	}
	var photoRows []photoRow
	var err error
	if currentUserID != nil {
		err = r.db.SelectContext(ctx, &photoRows, `
			SELECT id, card_id, uploader_id, url, "order", visibility, created_at, updated_at, total_count
			FROM (
				SELECT p.*,
					COUNT(*) OVER (PARTITION BY p.card_id) AS total_count,
					ROW_NUMBER() OVER (
						PARTITION BY p.card_id
						ORDER BY CASE WHEN p.id = c.cover_photo_id THEN 0 ELSE 1 END, p.created_at DESC
					) AS rn
				FROM photos p
				JOIN cards c ON p.card_id = c.id
				WHERE p.card_id = ANY($1)
				  AND (p.visibility = 'public' OR c.user_id = $2)
			) ranked WHERE rn <= 4
		`, pq.Array(cardIDs), *currentUserID)
	} else {
		err = r.db.SelectContext(ctx, &photoRows, `
			SELECT id, card_id, uploader_id, url, "order", visibility, created_at, updated_at, total_count
			FROM (
				SELECT p.*,
					COUNT(*) OVER (PARTITION BY p.card_id) AS total_count,
					ROW_NUMBER() OVER (
						PARTITION BY p.card_id
						ORDER BY CASE WHEN p.id = c.cover_photo_id THEN 0 ELSE 1 END, p.created_at DESC
					) AS rn
				FROM photos p
				JOIN cards c ON p.card_id = c.id
				WHERE p.card_id = ANY($1) AND p.visibility = 'public'
			) ranked WHERE rn <= 4
		`, pq.Array(cardIDs))
	}
	if err != nil {
		return nil, 0, err
	}

	cardMap := make(map[string]*model.Card, len(cards))
	for i := range cards {
		cards[i].Places = []model.Place{}
		cards[i].Photos = []model.Photo{}
		cardMap[cards[i].ID] = &cards[i]
	}
	for _, p := range places {
		if p.CardID != nil {
			if c, ok := cardMap[*p.CardID]; ok {
				c.Places = append(c.Places, p)
			}
		}
	}
	for _, row := range photoRows {
		if row.CardID != nil {
			if c, ok := cardMap[*row.CardID]; ok {
				c.PhotoCount = row.TotalCount
				c.Photos = append(c.Photos, row.Photo)
			}
		}
	}

	return cards, total, nil
}

func (r *CardRepo) Create(ctx context.Context, category, title string, cityID *string, userID *string) (*model.Card, error) {
	var c model.Card
	c.Places = []model.Place{}
	c.Photos = []model.Photo{}
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO cards (id, user_id, category, title, city_id, visibility, sort_order)
		VALUES ($1, $2, $3, $4, $5, 'public', NEXTVAL('card_sort_order_seq'))
		RETURNING id, user_id, city_id, category, title, cover_photo_id,
		          visibility, sort_order, created_at, updated_at, NULL AS owner_nickname
	`, uuid.New().String(), userID, category, title, cityID).StructScan(&c)
	return &c, err
}

func (r *CardRepo) Update(ctx context.Context, id, userID, category, title string, cityID *string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE cards SET category = $1, title = $2, city_id = $3, updated_at = now()
		WHERE id = $4 AND user_id = $5
	`, category, title, cityID, id, userID)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return fmt.Errorf("not found or not owner")
	}
	return nil
}

func (r *CardRepo) ReplacePlaces(ctx context.Context, cardID, userID string, places []model.PlaceInput) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	if err := tx.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM cards WHERE id = $1 AND user_id = $2`, cardID, userID,
	).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("not found or not owner")
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM places WHERE card_id = $1`, cardID); err != nil {
		return err
	}
	for i, p := range places {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO places (id, card_id, name, type, lat, lng, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, uuid.New().String(), cardID, p.Name, p.Type, p.Lat, p.Lng, i); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *CardRepo) Delete(ctx context.Context, id, userID string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM places WHERE card_id = $1`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM photos WHERE card_id = $1`, id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM cards WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return fmt.Errorf("not found or not owner")
	}
	return tx.Commit()
}

func (r *CardRepo) VerifyOwner(ctx context.Context, cardID, userID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM cards WHERE id = $1 AND user_id = $2`, cardID, userID,
	).Scan(&count)
	return count > 0, err
}

func (r *CardRepo) SetCoverPhoto(ctx context.Context, cardID, photoID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE cards SET cover_photo_id = $1 WHERE id = $2 AND cover_photo_id IS NULL`,
		photoID, cardID,
	)
	return err
}

func (r *CardRepo) UpdateSortOrders(ctx context.Context, ids []string, userID string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, id := range ids {
		if _, err := tx.ExecContext(ctx,
			`UPDATE cards SET sort_order = $1 WHERE id = $2 AND user_id = $3`,
			i, id, userID,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}
