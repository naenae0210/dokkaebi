package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"hangwith/api/internal/handler"
	"hangwith/api/internal/model"
)

func newEcho() *echo.Echo {
	e := echo.New()
	return e
}

func TestCardHandler_List_Success(t *testing.T) {
	now := time.Now()
	mock := &mockCardRepo{
		listResult: []model.Card{
			{ID: "card-1", Category: "Beach", Title: "Tampa Beach", CreatedAt: now, UpdatedAt: now, Places: []model.Place{}, Photos: []model.Photo{}},
			{ID: "card-2", Category: "City", Title: "NYC Trip", CreatedAt: now, UpdatedAt: now, Places: []model.Place{}, Photos: []model.Photo{}},
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cards", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCardHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.Card
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 2)
	assert.Equal(t, "card-1", result[0].ID)
}

func TestCardHandler_List_DBError(t *testing.T) {
	mock := &mockCardRepo{listErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cards", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCardHandler(mock)
	err := h.List(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestCardHandler_Create_Success(t *testing.T) {
	now := time.Now()
	cityID := "city-1"
	mock := &mockCardRepo{
		createResult: &model.Card{
			ID: "card-new", Category: "Beach", Title: "New Card",
			CityID: &cityID, CreatedAt: now, UpdatedAt: now,
			Places: []model.Place{}, Photos: []model.Photo{},
		},
	}

	body := `{"category":"Beach","title":"New Card","city_id":"city-1"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCardHandler(mock)
	require.NoError(t, h.Create(c))

	assert.Equal(t, http.StatusCreated, rec.Code)

	var result model.Card
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Equal(t, "card-new", result.ID)
	assert.Equal(t, "Beach", result.Category)
}

func TestCardHandler_Create_InvalidBody(t *testing.T) {
	mock := &mockCardRepo{}

	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards", strings.NewReader(`invalid json`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCardHandler(mock)
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestCardHandler_Update_Success(t *testing.T) {
	mock := &mockCardRepo{updateErr: nil}

	body := `{"category":"City","title":"Updated","city_id":"city-1"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPut, "/api/cards/card-1", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")

	h := handler.NewCardHandler(mock)
	require.NoError(t, h.Update(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)
}

func TestCardHandler_Update_DBError(t *testing.T) {
	mock := &mockCardRepo{updateErr: errDB}

	body := `{"category":"City","title":"Updated"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPut, "/api/cards/card-1", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")

	h := handler.NewCardHandler(mock)
	err := h.Update(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestCardHandler_ReplacePlaces_Success(t *testing.T) {
	mock := &mockCardRepo{replacesErr: nil}

	body := `[{"name":"Cafe X","type":"Cafe","lat":27.9,"lng":-82.4}]`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards/card-1/places", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")

	h := handler.NewCardHandler(mock)
	require.NoError(t, h.ReplacePlaces(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)
}
