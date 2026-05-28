package repository

import (
	"context"

	"hangwith/api/internal/model"
)

type UserRepository interface {
	UpsertByProvider(ctx context.Context, provider, providerID, email, nickname string, avatarURL *string) (*model.User, error)
	FindByID(ctx context.Context, id string) (*model.User, error)
	ListNicknames(ctx context.Context) ([]string, error)
	DeleteWithPhotos(ctx context.Context, userID string) (photoURLs []string, err error)
}

type CardRepository interface {
	List(ctx context.Context, currentUserID *string, limit, offset int, cityID, category *string) ([]model.Card, int, error)
	Create(ctx context.Context, category, title string, cityID *string, userID *string) (*model.Card, error)
	Update(ctx context.Context, id, userID, category, title string, cityID *string) error
	Delete(ctx context.Context, id, userID string) error
	ReplacePlaces(ctx context.Context, cardID, userID string, places []model.PlaceInput) error
	VerifyOwner(ctx context.Context, cardID, userID string) (bool, error)
	SetCoverPhoto(ctx context.Context, cardID, photoID string) error
	UpdateSortOrders(ctx context.Context, ids []string, userID string) error
}

type CityRepository interface {
	List(ctx context.Context) ([]model.City, error)
	FindByName(ctx context.Context, name string) (*model.City, error)
	Create(ctx context.Context, name string, lat, lng *float64) (*model.City, error)
}

type CategoryRepository interface {
	List(ctx context.Context) ([]model.Category, error)
	Create(ctx context.Context, id, label, emoji string, sortOrder int) (*model.Category, error)
	Delete(ctx context.Context, id string) error
}

type PlaceTypeRepository interface {
	List(ctx context.Context) ([]model.PlaceType, error)
	Create(ctx context.Context, id, label, color string, sortOrder int) (*model.PlaceType, error)
	Delete(ctx context.Context, id string) error
}

type NameRepository interface {
	List(ctx context.Context) ([]model.Name, error)
	Create(ctx context.Context, name string) (*model.Name, error)
}

type PhotoRepository interface {
	Create(ctx context.Context, cardID, uploaderID, url string, order int, visibility string) (*model.Photo, error)
	DeleteByUploader(ctx context.Context, photoID, uploaderID string) (url string, err error)
}
