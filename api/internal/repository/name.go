package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"hangwith/api/internal/model"
)

type NameRepo struct {
	db *sqlx.DB
}

func NewNameRepo(db *sqlx.DB) *NameRepo {
	return &NameRepo{db: db}
}

func (r *NameRepo) List(ctx context.Context) ([]model.Name, error) {
	var names []model.Name
	err := r.db.SelectContext(ctx, &names, `SELECT * FROM names ORDER BY created_at`)
	if names == nil {
		names = []model.Name{}
	}
	return names, err
}

func (r *NameRepo) Create(ctx context.Context, name string) (*model.Name, error) {
	var n model.Name
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO names (id, name) VALUES ($1, $2) RETURNING *
	`, uuid.New().String(), name).StructScan(&n)
	return &n, err
}
