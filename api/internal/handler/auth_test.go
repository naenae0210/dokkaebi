package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"hangwith/api/internal/handler"
	"hangwith/api/internal/model"
)

// GoogleLogin / GoogleCallback 은 외부 OAuth2 리다이렉트 의존으로 테스트 제외

// --- AuthHandler.Me ---

func TestAuthHandler_Me_Unauthenticated(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAuthHandler(&mockUserRepo{})
	err := h.Me(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusUnauthorized, he.Code)
}

func TestAuthHandler_Me_Success(t *testing.T) {
	now := time.Now()
	mock := &mockUserRepo{
		findResult: &model.User{
			ID: "user-1", Email: "test@example.com", Nickname: "tester",
			Provider: "google", ProviderID: "gid-1",
			CreatedAt: now, UpdatedAt: now,
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	c := withUser(e.NewContext(req, rec), "user-1")

	h := handler.NewAuthHandler(mock)
	require.NoError(t, h.Me(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result model.User
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Equal(t, "user-1", result.ID)
	assert.Equal(t, "tester", result.Nickname)
}

func TestAuthHandler_Me_UserNotFound(t *testing.T) {
	mock := &mockUserRepo{findErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	c := withUser(e.NewContext(req, rec), "user-1")

	h := handler.NewAuthHandler(mock)
	err := h.Me(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusUnauthorized, he.Code)
}

// --- AuthHandler.Nicknames ---

func TestAuthHandler_Nicknames_Success(t *testing.T) {
	mock := &mockUserRepo{
		nicknamesResult: []string{"Alice Smith", "Bob Jones", "Carol"},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/nicknames", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAuthHandler(mock)
	require.NoError(t, h.Nicknames(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []string
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	// handler가 성명에서 이름(첫 번째 단어)만 추출
	assert.Equal(t, []string{"Alice", "Bob", "Carol"}, result)
}

func TestAuthHandler_Nicknames_DBError(t *testing.T) {
	mock := &mockUserRepo{nicknamesErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/nicknames", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAuthHandler(mock)
	err := h.Nicknames(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

// --- AuthHandler.Logout ---

func TestAuthHandler_Logout(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAuthHandler(&mockUserRepo{})
	require.NoError(t, h.Logout(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)

	var sessionCookie *http.Cookie
	for _, ck := range rec.Result().Cookies() {
		if ck.Name == "session" {
			sessionCookie = ck
		}
	}
	require.NotNil(t, sessionCookie)
	assert.Equal(t, "", sessionCookie.Value)
	assert.Equal(t, -1, sessionCookie.MaxAge)
}

// --- AuthHandler.DeleteAccount ---

func TestAuthHandler_DeleteAccount_Unauthenticated(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := handler.NewAuthHandler(&mockUserRepo{})
	err := h.DeleteAccount(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusUnauthorized, he.Code)
}

func TestAuthHandler_DeleteAccount_Success(t *testing.T) {
	// deletePhotoURLs가 빈 슬라이스면 os.Remove 호출 없이 204 반환
	mock := &mockUserRepo{deletePhotoURLs: []string{}}

	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	c := withUser(e.NewContext(req, rec), "user-1")

	h := handler.NewAuthHandler(mock)
	require.NoError(t, h.DeleteAccount(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)

	var sessionCookie *http.Cookie
	for _, ck := range rec.Result().Cookies() {
		if ck.Name == "session" {
			sessionCookie = ck
		}
	}
	require.NotNil(t, sessionCookie)
	assert.Equal(t, "", sessionCookie.Value)
	assert.Equal(t, -1, sessionCookie.MaxAge)
}

func TestAuthHandler_DeleteAccount_DBError(t *testing.T) {
	mock := &mockUserRepo{deleteErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	c := withUser(e.NewContext(req, rec), "user-1")

	h := handler.NewAuthHandler(mock)
	err := h.DeleteAccount(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}
