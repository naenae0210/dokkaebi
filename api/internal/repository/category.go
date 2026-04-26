package repository

import (
	"context"

	"github.com/jmoiron/sqlx"

	"hangwith/api/internal/model"
)

type CategoryRepo struct {
	db *sqlx.DB
}

func NewCategoryRepo(db *sqlx.DB) *CategoryRepo {
	return &CategoryRepo{db: db}
}

func (r *CategoryRepo) List(ctx context.Context) ([]model.Category, error) {
	var cats []model.Category
	err := r.db.SelectContext(ctx, &cats,
		`SELECT * FROM categories ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	if cats == nil {
		return []model.Category{}, nil
	}
	return cats, nil
}

func (r *CategoryRepo) Create(ctx context.Context, id, label, emoji string, sortOrder int) (*model.Category, error) {
	var c model.Category
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO categories (id, label, emoji, sort_order)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order
		RETURNING *
	`, id, label, emoji, sortOrder).StructScan(&c)
	return &c, err
}

func (r *CategoryRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM categories WHERE id = $1`, id)
	return err
}

// --- PlaceType ---

type PlaceTypeRepo struct {
	db *sqlx.DB
}

func NewPlaceTypeRepo(db *sqlx.DB) *PlaceTypeRepo {
	return &PlaceTypeRepo{db: db}
}

func (r *PlaceTypeRepo) List(ctx context.Context) ([]model.PlaceType, error) {
	var pts []model.PlaceType
	err := r.db.SelectContext(ctx, &pts,
		`SELECT * FROM place_types ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	if pts == nil {
		return []model.PlaceType{}, nil
	}
	return pts, nil
}

func (r *PlaceTypeRepo) Create(ctx context.Context, id, label, color string, sortOrder int) (*model.PlaceType, error) {
	var pt model.PlaceType
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO place_types (id, label, color, sort_order)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order
		RETURNING *
	`, id, label, color, sortOrder).StructScan(&pt)
	return &pt, err
}

func (r *PlaceTypeRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM place_types WHERE id = $1`, id)
	return err
}
