package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"hangwith/api/internal/model"
)

type CityRepo struct {
	db *sqlx.DB
}

func NewCityRepo(db *sqlx.DB) *CityRepo {
	return &CityRepo{db: db}
}

func (r *CityRepo) List(ctx context.Context) ([]model.City, error) {
	var cities []model.City
	err := r.db.SelectContext(ctx, &cities, `SELECT * FROM cities ORDER BY name`)
	if cities == nil {
		cities = []model.City{}
	}
	return cities, err
}

func (r *CityRepo) FindByName(ctx context.Context, name string) (*model.City, error) {
	var city model.City
	err := r.db.GetContext(ctx, &city, `SELECT * FROM cities WHERE name ILIKE $1 LIMIT 1`, name)
	if err != nil {
		return nil, err
	}
	return &city, nil
}

func (r *CityRepo) Create(ctx context.Context, name string, lat, lng *float64) (*model.City, error) {
	var city model.City
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO cities (id, name, lat, lng)
		VALUES ($1, $2, $3, $4)
		RETURNING *
	`, uuid.New().String(), name, lat, lng).StructScan(&city)
	return &city, err
}
