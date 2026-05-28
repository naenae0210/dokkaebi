package handler_test

import (
	"context"
	"errors"

	"hangwith/api/internal/model"
)

var errDB = errors.New("database error")

// --- mockCardRepo ---

type mockCardRepo struct {
	listResult   []model.Card
	listErr      error
	createResult *model.Card
	createErr    error
	updateErr    error
	deleteErr    error
	replacesErr  error
	coverErr     error
	ownerResult  bool
}

func (m *mockCardRepo) List(_ context.Context, _ *string, _, _ int, _, _ *string) ([]model.Card, int, error) {
	return m.listResult, len(m.listResult), m.listErr
}
func (m *mockCardRepo) Create(_ context.Context, category, title string, cityID *string, userID *string) (*model.Card, error) {
	return m.createResult, m.createErr
}
func (m *mockCardRepo) Update(_ context.Context, id, userID, category, title string, cityID *string) error {
	return m.updateErr
}
func (m *mockCardRepo) ReplacePlaces(_ context.Context, cardID, userID string, places []model.PlaceInput) error {
	return m.replacesErr
}
func (m *mockCardRepo) Delete(_ context.Context, id, userID string) error {
	return m.deleteErr
}
func (m *mockCardRepo) VerifyOwner(_ context.Context, cardID, userID string) (bool, error) {
	return m.ownerResult, nil
}
func (m *mockCardRepo) UpdateSortOrders(_ context.Context, ids []string, userID string) error {
	return nil
}
func (m *mockCardRepo) SetCoverPhoto(_ context.Context, cardID, photoID string) error {
	return m.coverErr
}

// --- mockCityRepo ---

type mockCityRepo struct {
	listResult   []model.City
	listErr      error
	findResult   *model.City
	findErr      error
	createResult *model.City
	createErr    error
}

func (m *mockCityRepo) List(_ context.Context) ([]model.City, error) {
	return m.listResult, m.listErr
}
func (m *mockCityRepo) FindByName(_ context.Context, name string) (*model.City, error) {
	return m.findResult, m.findErr
}
func (m *mockCityRepo) Create(_ context.Context, name string, lat, lng *float64) (*model.City, error) {
	return m.createResult, m.createErr
}

// --- mockNameRepo ---

type mockNameRepo struct {
	listResult   []model.Name
	listErr      error
	createResult *model.Name
	createErr    error
}

func (m *mockNameRepo) List(_ context.Context) ([]model.Name, error) {
	return m.listResult, m.listErr
}
func (m *mockNameRepo) Create(_ context.Context, name string) (*model.Name, error) {
	return m.createResult, m.createErr
}

// --- mockPhotoRepo ---

type mockPhotoRepo struct {
	createResult *model.Photo
	createErr    error
	deleteURL    string
	deleteErr    error
}

func (m *mockPhotoRepo) Create(_ context.Context, cardID, uploaderID, url string, order int, visibility string) (*model.Photo, error) {
	return m.createResult, m.createErr
}
func (m *mockPhotoRepo) DeleteByUploader(_ context.Context, photoID, uploaderID string) (string, error) {
	return m.deleteURL, m.deleteErr
}
