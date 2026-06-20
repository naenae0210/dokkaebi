package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"hangwith/api/internal/handler"
	"hangwith/api/internal/model"
)

// --- CategoryHandler ---

func TestCategoryHandler_List_Success(t *testing.T) {
	mock := &mockCategoryRepo{
		listResult: []model.Category{
			{ID: "Beach", Label: "Beach", Emoji: "🏖", SortOrder: 1},
			{ID: "City", Label: "City", Emoji: "🏙", SortOrder: 2},
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/categories", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCategoryHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.Category
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 2)
	assert.Equal(t, "Beach", result[0].ID)
}

func TestCategoryHandler_List_DBError(t *testing.T) {
	mock := &mockCategoryRepo{listErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/categories", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCategoryHandler(mock)
	err := h.List(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestCategoryHandler_Create_Success(t *testing.T) {
	mock := &mockCategoryRepo{
		createResult: &model.Category{ID: "Food", Label: "Food", Emoji: "🍔", SortOrder: 9},
	}

	body := `{"id":"Food","label":"Food","emoji":"🍔","sort_order":9}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/categories", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCategoryHandler(mock)
	require.NoError(t, h.Create(c))

	assert.Equal(t, http.StatusCreated, rec.Code)

	var result model.Category
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Equal(t, "Food", result.ID)
	assert.Equal(t, "🍔", result.Emoji)
}

func TestCategoryHandler_Create_InvalidBody(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/categories", strings.NewReader("not json"))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCategoryHandler(&mockCategoryRepo{})
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestCategoryHandler_Create_MissingFields(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/categories", strings.NewReader(`{"id":"","label":""}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCategoryHandler(&mockCategoryRepo{})
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestCategoryHandler_Create_DBError(t *testing.T) {
	mock := &mockCategoryRepo{createErr: errDB}

	body := `{"id":"Food","label":"Food"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/categories", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCategoryHandler(mock)
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestCategoryHandler_Delete_Success(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/categories/Beach", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("Beach")

	h := handler.NewCategoryHandler(&mockCategoryRepo{})
	require.NoError(t, h.Delete(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)
}

func TestCategoryHandler_Delete_DBError(t *testing.T) {
	mock := &mockCategoryRepo{deleteErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/categories/Beach", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("Beach")

	h := handler.NewCategoryHandler(mock)
	err := h.Delete(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

// --- PlaceTypeHandler ---

func TestPlaceTypeHandler_List_Success(t *testing.T) {
	mock := &mockPlaceTypeRepo{
		listResult: []model.PlaceType{
			{ID: "Restaurant", Label: "Restaurant", Color: "green", SortOrder: 1},
			{ID: "Cafe", Label: "Cafe", Color: "amber", SortOrder: 2},
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/place-types", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewPlaceTypeHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.PlaceType
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 2)
	assert.Equal(t, "Restaurant", result[0].ID)
}

func TestPlaceTypeHandler_List_DBError(t *testing.T) {
	mock := &mockPlaceTypeRepo{listErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/place-types", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewPlaceTypeHandler(mock)
	err := h.List(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestPlaceTypeHandler_Create_Success(t *testing.T) {
	mock := &mockPlaceTypeRepo{
		createResult: &model.PlaceType{ID: "Bar", Label: "Bar", Color: "blue", SortOrder: 4},
	}

	body := `{"id":"Bar","label":"Bar","color":"blue","sort_order":4}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/place-types", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewPlaceTypeHandler(mock)
	require.NoError(t, h.Create(c))

	assert.Equal(t, http.StatusCreated, rec.Code)

	var result model.PlaceType
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Equal(t, "Bar", result.ID)
	assert.Equal(t, "blue", result.Color)
}

func TestPlaceTypeHandler_Create_InvalidBody(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/place-types", strings.NewReader("not json"))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewPlaceTypeHandler(&mockPlaceTypeRepo{})
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestPlaceTypeHandler_Create_MissingFields(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/place-types", strings.NewReader(`{"id":"","label":""}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewPlaceTypeHandler(&mockPlaceTypeRepo{})
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestPlaceTypeHandler_Create_DBError(t *testing.T) {
	mock := &mockPlaceTypeRepo{createErr: errDB}

	body := `{"id":"Bar","label":"Bar"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/place-types", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewPlaceTypeHandler(mock)
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestPlaceTypeHandler_Delete_Success(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/place-types/Restaurant", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("Restaurant")

	h := handler.NewPlaceTypeHandler(&mockPlaceTypeRepo{})
	require.NoError(t, h.Delete(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)
}

func TestPlaceTypeHandler_Delete_DBError(t *testing.T) {
	mock := &mockPlaceTypeRepo{deleteErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/place-types/Restaurant", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("Restaurant")

	h := handler.NewPlaceTypeHandler(mock)
	err := h.Delete(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}
