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
	"hangwith/api/internal/model"
)


func TestAIHandler_GeneratePlan_InvalidBody(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/plan", strings.NewReader("not json"))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAIHandler(&mockCategoryRepo{}, &mockPlaceTypeRepo{})
	err := h.GeneratePlan(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestAIHandler_GeneratePlan_EmptyPrompt(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/plan", strings.NewReader(`{"prompt":"   "}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAIHandler(&mockCategoryRepo{}, &mockPlaceTypeRepo{})
	err := h.GeneratePlan(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestAIHandler_GeneratePlan_PromptTooLong(t *testing.T) {
	body := `{"prompt":"` + strings.Repeat("a", 301) + `"}`
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/plan", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAIHandler(&mockCategoryRepo{}, &mockPlaceTypeRepo{})
	err := h.GeneratePlan(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestAIHandler_GeneratePlan_CategoryRepoError(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/plan", strings.NewReader(`{"prompt":"도쿄 여행일정 짜줘"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAIHandler(&mockCategoryRepo{listErr: errDB}, &mockPlaceTypeRepo{})
	err := h.GeneratePlan(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestAIHandler_GeneratePlan_PlaceTypeRepoError(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/plan", strings.NewReader(`{"prompt":"도쿄 여행일정 짜줘"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	mockCat := &mockCategoryRepo{listResult: []model.Category{{ID: "City", Label: "City"}}}
	h := handler.NewAIHandler(mockCat, &mockPlaceTypeRepo{listErr: errDB})
	err := h.GeneratePlan(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

func TestAIHandler_GeneratePlan_NoCategoriesConfigured(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/ai/plan", strings.NewReader(`{"prompt":"도쿄 여행일정 짜줘"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAIHandler(&mockCategoryRepo{}, &mockPlaceTypeRepo{listResult: []model.PlaceType{{ID: "Cafe"}}})
	err := h.GeneratePlan(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}
