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
	replacesErr  error
	coverErr     error
}

func (m *mockCardRepo) List(_ context.Context) ([]model.Card, error) {
	return m.listResult, m.listErr
}
func (m *mockCardRepo) Create(_ context.Context, category, title string, cityID *string) (*model.Card, error) {
	return m.createResult, m.createErr
}
func (m *mockCardRepo) Update(_ context.Context, id, category, title string, cityID *string) error {
	return m.updateErr
}
func (m *mockCardRepo) ReplacePlaces(_ context.Context, cardID string, places []model.PlaceInput) error {
	return m.replacesErr
}
func (m *mockCardRepo) SetCoverPhoto(_ context.Context, cardID, url string) error {
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
