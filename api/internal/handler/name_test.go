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

func TestNameHandler_List_Success(t *testing.T) {
	now := time.Now()
	mock := &mockNameRepo{
		listResult: []model.Name{
			{ID: "name-1", Name: "nae", CreatedAt: now},
			{ID: "name-2", Name: "trey", CreatedAt: now},
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/names", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewNameHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.Name
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 2)
}

func TestNameHandler_List_Empty(t *testing.T) {
	mock := &mockNameRepo{listResult: []model.Name{}}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/names", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewNameHandler(mock)
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.Name
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Empty(t, result)
}

func TestNameHandler_List_DBError(t *testing.T) {
	mock := &mockNameRepo{listErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/names", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewNameHandler(mock)
	err := h.List(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestNameHandler_Create_Success(t *testing.T) {
	now := time.Now()
	mock := &mockNameRepo{
		createResult: &model.Name{ID: "name-new", Name: "nae", CreatedAt: now},
	}

	body := `{"name":"nae"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/names", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewNameHandler(mock)
	require.NoError(t, h.Create(c))

	assert.Equal(t, http.StatusCreated, rec.Code)

	var result model.Name
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Equal(t, "nae", result.Name)
}

func TestNameHandler_Create_InvalidBody(t *testing.T) {
	mock := &mockNameRepo{}

	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/names", strings.NewReader(`not json`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewNameHandler(mock)
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestNameHandler_Create_DBError(t *testing.T) {
	mock := &mockNameRepo{createErr: errDB}

	body := `{"name":"nae"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/names", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewNameHandler(mock)
	err := h.Create(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}
