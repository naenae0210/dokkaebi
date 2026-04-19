package handler_test

import (
	"database/sql"
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

func TestCityHandler_List_Success(t *testing.T) {
	mock := &mockCityRepo{
		listResult: []model.City{
			{ID: "city-1", Name: "Tampa", Country: "US"},
			{ID: "city-2", Name: "New York", Country: "US"},
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cities", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCityHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.City
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 2)
}

func TestCityHandler_List_SearchFound(t *testing.T) {
	city := &model.City{ID: "city-1", Name: "Tampa", Country: "US"}
	mock := &mockCityRepo{findResult: city}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cities?search=Tampa", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.QueryParams().Set("search", "Tampa")

	h := handler.NewCityHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.City
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 1)
	assert.Equal(t, "Tampa", result[0].Name)
}

func TestCityHandler_List_SearchNotFound(t *testing.T) {
	mock := &mockCityRepo{findErr: sql.ErrNoRows}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cities?search=Unknown", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.QueryParams().Set("search", "Unknown")

	h := handler.NewCityHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Empty(t, result)
}

func TestCityHandler_Create_Success(t *testing.T) {
	lat, lng := 27.9, -82.4
	mock := &mockCityRepo{
		createResult: &model.City{ID: "city-new", Name: "Tampa", Country: "US", Lat: &lat, Lng: &lng},
	}

	body := `{"name":"Tampa","lat":27.9,"lng":-82.4}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cities", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewCityHandler(mock)
	require.NoError(t, h.Create(c))

	assert.Equal(t, http.StatusCreated, rec.Code)

	var result model.City
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Equal(t, "Tampa", result.Name)
}
