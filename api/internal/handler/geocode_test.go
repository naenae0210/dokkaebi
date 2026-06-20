package handler_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"hangwith/api/internal/handler"
)

// 실제 Google Maps API 호출은 외부 의존이므로 입력 검증만 테스트

func TestGeocodeHandler_MissingAddress(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/geocode", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewGeocodeHandler()
	err := h.Geocode(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestGeocodeHandler_AddressTooLong(t *testing.T) {
	longAddress := strings.Repeat("a", 513)

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/geocode", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.QueryParams().Set("address", longAddress)

	h := handler.NewGeocodeHandler()
	err := h.Geocode(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}
