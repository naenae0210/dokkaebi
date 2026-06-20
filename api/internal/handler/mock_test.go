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
func (m *mockCityRepo) FindByCoords(_ context.Context, lat, lng float64) (*model.City, error) {
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
	listResult   []model.Photo
	listErr      error
	createResult *model.Photo
	createErr    error
	deleteURL    string
	deleteErr    error
}

func (m *mockPhotoRepo) ListByCard(_ context.Context, _ string, _ *string) ([]model.Photo, error) {
	return m.listResult, m.listErr
}
func (m *mockPhotoRepo) Create(_ context.Context, cardID, uploaderID, url string, order int, visibility string) (*model.Photo, error) {
	return m.createResult, m.createErr
}
func (m *mockPhotoRepo) DeleteByUploader(_ context.Context, photoID, uploaderID string) (string, error) {
	return m.deleteURL, m.deleteErr
}

// --- mockUserRepo ---

type mockUserRepo struct {
	findResult      *model.User
	findErr         error
	nicknamesResult []string
	nicknamesErr    error
	deletePhotoURLs []string
	deleteErr       error
}

func (m *mockUserRepo) UpsertByProvider(_ context.Context, _, _, _, _ string, _ *string) (*model.User, error) {
	return m.findResult, m.findErr
}
func (m *mockUserRepo) FindByID(_ context.Context, _ string) (*model.User, error) {
	return m.findResult, m.findErr
}
func (m *mockUserRepo) ListNicknames(_ context.Context) ([]string, error) {
	return m.nicknamesResult, m.nicknamesErr
}
func (m *mockUserRepo) DeleteWithPhotos(_ context.Context, _ string) ([]string, error) {
	return m.deletePhotoURLs, m.deleteErr
}

// --- mockCategoryRepo ---

type mockCategoryRepo struct {
	listResult   []model.Category
	listErr      error
	createResult *model.Category
	createErr    error
	deleteErr    error
}

func (m *mockCategoryRepo) List(_ context.Context) ([]model.Category, error) {
	return m.listResult, m.listErr
}
func (m *mockCategoryRepo) Create(_ context.Context, id, label, emoji string, sortOrder int) (*model.Category, error) {
	return m.createResult, m.createErr
}
func (m *mockCategoryRepo) Delete(_ context.Context, _ string) error {
	return m.deleteErr
}

// --- mockPlaceTypeRepo ---

type mockPlaceTypeRepo struct {
	listResult   []model.PlaceType
	listErr      error
	createResult *model.PlaceType
	createErr    error
	deleteErr    error
}

func (m *mockPlaceTypeRepo) List(_ context.Context) ([]model.PlaceType, error) {
	return m.listResult, m.listErr
}
func (m *mockPlaceTypeRepo) Create(_ context.Context, id, label, color string, sortOrder int) (*model.PlaceType, error) {
	return m.createResult, m.createErr
}
func (m *mockPlaceTypeRepo) Delete(_ context.Context, _ string) error {
	return m.deleteErr
}
