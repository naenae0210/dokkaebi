package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"hangwith/api/internal/model"
)

type PhotoRepo struct {
	db *sqlx.DB
}

func NewPhotoRepo(db *sqlx.DB) *PhotoRepo {
	return &PhotoRepo{db: db}
}

func (r *PhotoRepo) DeleteByUploader(ctx context.Context, photoID, uploaderID string) (string, error) {
	var url string
	err := r.db.QueryRowContext(ctx, `
		DELETE FROM photos
		WHERE id = $1 AND uploader_id = $2
		RETURNING url
	`, photoID, uploaderID).Scan(&url)
	if err != nil {
		return "", err
	}
	return url, nil
}

func (r *PhotoRepo) ListByCard(ctx context.Context, cardID string, currentUserID *string) ([]model.Photo, error) {
	var photos []model.Photo
	var err error
	if currentUserID != nil {
		err = r.db.SelectContext(ctx, &photos, `
			SELECT p.*
			FROM photos p
			JOIN cards c ON p.card_id = c.id
			WHERE p.card_id = $1
			  AND (p.visibility = 'public' OR c.user_id = $2)
			ORDER BY CASE WHEN p.id = c.cover_photo_id THEN 0 ELSE 1 END, p.created_at DESC
		`, cardID, *currentUserID)
	} else {
		err = r.db.SelectContext(ctx, &photos, `
			SELECT p.*
			FROM photos p
			JOIN cards c ON p.card_id = c.id
			WHERE p.card_id = $1 AND p.visibility = 'public'
			ORDER BY CASE WHEN p.id = c.cover_photo_id THEN 0 ELSE 1 END, p.created_at DESC
		`, cardID)
	}
	if err != nil {
		return nil, err
	}
	if photos == nil {
		photos = []model.Photo{}
	}
	return photos, nil
}

func (r *PhotoRepo) Create(ctx context.Context, cardID, uploaderID, url string, order int, visibility string) (*model.Photo, error) {
	if visibility != "private" {
		visibility = "public"
	}
	var p model.Photo
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO photos (id, card_id, uploader_id, url, "order", visibility)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *
	`, uuid.New().String(), cardID, uploaderID, url, order, visibility).StructScan(&p)
	return &p, err
}
