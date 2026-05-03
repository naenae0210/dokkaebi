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
