package repository

import (
	"context"

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

func (r *CardRepo) List(ctx context.Context) ([]model.Card, error) {
	var cards []model.Card
	if err := r.db.SelectContext(ctx, &cards, `
		SELECT id, city_id, category, title, cover_photo, created_at, updated_at
		FROM cards ORDER BY created_at DESC
	`); err != nil {
		return nil, err
	}
	if len(cards) == 0 {
		return []model.Card{}, nil
	}

	// collect IDs
	cardIDs := make([]string, len(cards))
	cityIDSet := map[string]struct{}{}
	for i, c := range cards {
		cardIDs[i] = c.ID
		if c.CityID != nil {
			cityIDSet[*c.CityID] = struct{}{}
		}
	}

	// load cities
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
			return nil, err
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

	// load places
	var places []model.Place
	if err := r.db.SelectContext(ctx, &places,
		`SELECT * FROM places WHERE card_id = ANY($1)`,
		pq.Array(cardIDs),
	); err != nil {
		return nil, err
	}

	// load photos
	var photos []model.Photo
	if err := r.db.SelectContext(ctx, &photos,
		`SELECT * FROM photos WHERE card_id = ANY($1) ORDER BY "order"`,
		pq.Array(cardIDs),
	); err != nil {
		return nil, err
	}

	// assemble
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
	for _, p := range photos {
		if p.CardID != nil {
			if c, ok := cardMap[*p.CardID]; ok {
				c.Photos = append(c.Photos, p)
			}
		}
	}

	return cards, nil
}

func (r *CardRepo) Create(ctx context.Context, category, title string, cityID *string) (*model.Card, error) {
	var c model.Card
	c.Places = []model.Place{}
	c.Photos = []model.Photo{}
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO cards (id, category, title, city_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, city_id, category, title, cover_photo, created_at, updated_at
	`, uuid.New().String(), category, title, cityID).StructScan(&c)
	return &c, err
}

func (r *CardRepo) Update(ctx context.Context, id, category, title string, cityID *string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE cards SET category = $1, title = $2, city_id = $3, updated_at = now()
		WHERE id = $4
	`, category, title, cityID, id)
	return err
}

func (r *CardRepo) ReplacePlaces(ctx context.Context, cardID string, places []model.PlaceInput) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM places WHERE card_id = $1`, cardID); err != nil {
		return err
	}
	for _, p := range places {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO places (id, card_id, name, type, lat, lng)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, uuid.New().String(), cardID, p.Name, p.Type, p.Lat, p.Lng); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *CardRepo) SetCoverPhoto(ctx context.Context, cardID, url string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE cards SET cover_photo = $1 WHERE id = $2 AND cover_photo IS NULL`,
		url, cardID,
	)
	return err
}
