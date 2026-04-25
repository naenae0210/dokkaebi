package middleware

import (
	"fmt"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt"
	"github.com/labstack/echo/v4"
)

const userIDKey = "userID"

func jwtSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

func parseSessionCookie(cookieValue string) (string, error) {
	token, err := jwt.Parse(cookieValue, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", fmt.Errorf("missing sub")
	}
	return sub, nil
}

// JWTOptional reads the session cookie and sets the user ID in context if valid.
// Continues to next handler regardless (guests are allowed).
func JWTOptional(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if cookie, err := c.Cookie("session"); err == nil && cookie.Value != "" {
			if sub, err := parseSessionCookie(cookie.Value); err == nil {
				c.Set(userIDKey, sub)
			}
		}
		return next(c)
	}
}

// JWTRequired rejects requests with no valid session cookie.
func JWTRequired(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		cookie, err := c.Cookie("session")
		if err != nil || cookie.Value == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "login required")
		}
		sub, err := parseSessionCookie(cookie.Value)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid session")
		}
		c.Set(userIDKey, sub)
		return next(c)
	}
}

// UserIDFromContext returns the authenticated user's ID, or nil for guests.
func UserIDFromContext(c echo.Context) *string {
	v := c.Get(userIDKey)
	if v == nil {
		return nil
	}
	s, ok := v.(string)
	if !ok || s == "" {
		return nil
	}
	return &s
}
