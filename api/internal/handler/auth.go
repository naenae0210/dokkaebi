package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/labstack/echo/v4"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	appmw "hangwith/api/internal/middleware"
	"hangwith/api/internal/repository"
)

type AuthHandler struct {
	userRepo repository.UserRepository
	cfg      *oauth2.Config
}

func NewAuthHandler(userRepo repository.UserRepository) *AuthHandler {
	cfg := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("APP_URL") + "/api/auth/google/callback",
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
	return &AuthHandler{userRepo: userRepo, cfg: cfg}
}

// GoogleLogin redirects the user to Google's OAuth2 consent page.
func (h *AuthHandler) GoogleLogin(c echo.Context) error {
	state, err := randomState()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate state")
	}
	c.SetCookie(&http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   600, // 10 minutes
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	return c.Redirect(http.StatusTemporaryRedirect, h.cfg.AuthCodeURL(state))
}

// GoogleCallback handles the OAuth2 callback from Google.
func (h *AuthHandler) GoogleCallback(c echo.Context) error {
	// validate state
	stateCookie, err := c.Cookie("oauth_state")
	if err != nil || stateCookie.Value != c.QueryParam("state") {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid oauth state")
	}
	// clear state cookie
	c.SetCookie(&http.Cookie{Name: "oauth_state", Value: "", Path: "/", MaxAge: -1})

	code := c.QueryParam("code")
	if code == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "missing code")
	}

	token, err := h.cfg.Exchange(context.Background(), code)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "token exchange failed")
	}

	info, err := fetchGoogleUserInfo(token.AccessToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch user info")
	}

	user, err := h.userRepo.UpsertByProvider(
		c.Request().Context(),
		"google", info.ID, info.Email, info.Name, nullableString(info.Picture),
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to upsert user")
	}

	sessionToken, err := signJWT(user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create session")
	}

	c.SetCookie(&http.Cookie{
		Name:     "session",
		Value:    sessionToken,
		Path:     "/",
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	return c.Redirect(http.StatusTemporaryRedirect, os.Getenv("APP_URL"))
}

// Me returns the currently authenticated user, or 401.
func (h *AuthHandler) Me(c echo.Context) error {
	userID := appmw.UserIDFromContext(c)
	if userID == nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "not authenticated")
	}
	user, err := h.userRepo.FindByID(c.Request().Context(), *userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "user not found")
	}
	return c.JSON(http.StatusOK, user)
}

// Logout clears the session cookie.
func (h *AuthHandler) Logout(c echo.Context) error {
	c.SetCookie(&http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
	return c.NoContent(http.StatusNoContent)
}

// --- helpers ---

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func fetchGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}
	if info.ID == "" {
		return nil, fmt.Errorf("empty user ID from Google")
	}
	return &info, nil
}

func signJWT(userID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
	})
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func randomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
