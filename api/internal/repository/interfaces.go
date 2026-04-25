package repository

import (
	"context"

	"hangwith/api/internal/model"
)

type UserRepository interface {
	UpsertByProvider(ctx context.Context, provider, providerID, email, nickname string, avatarURL *string) (*model.User, error)
	FindByID(ctx context.Context, id string) (*model.User, error)
}

type CardRepository interface {
	List(ctx context.Context, currentUserID *string) ([]model.Card, error)
	Create(ctx context.Context, category, title string, cityID *string, userID *string) (*model.Card, error)
	Update(ctx context.Context, id, category, title string, cityID *string) error
	ReplacePlaces(ctx context.Context, cardID string, places []model.PlaceInput) error
	SetCoverPhoto(ctx context.Context, cardID, url string) error
}

type CityRepository interface {
	List(ctx context.Context) ([]model.City, error)
	FindByName(ctx context.Context, name string) (*model.City, error)
	Create(ctx context.Context, name string, lat, lng *float64) (*model.City, error)
}

type NameRepository interface {
	List(ctx context.Context) ([]model.Name, error)
	Create(ctx context.Context, name string) (*model.Name, error)
}

type PhotoRepository interface {
	Create(ctx context.Context, cardID, url string, order int, visibility string) (*model.Photo, error)
}
