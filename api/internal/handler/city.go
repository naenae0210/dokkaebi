package handler

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/repository"
)

type CityHandler struct {
	repo repository.CityRepository
}

func NewCityHandler(repo repository.CityRepository) *CityHandler {
	return &CityHandler{repo: repo}
}

// List returns all cities, or searches by name when ?search= is provided.
// Used by CitySearch to find-or-create a city.
func (h *CityHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	search := c.QueryParam("search")

	if search != "" {
		city, err := h.repo.FindByName(ctx, search)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return c.JSON(http.StatusOK, []any{})
			}
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, []any{city})
	}

	cities, err := h.repo.List(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, cities)
}

func (h *CityHandler) Create(c echo.Context) error {
	var req struct {
		Name string   `json:"name"`
		Lat  *float64 `json:"lat"`
		Lng  *float64 `json:"lng"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	city, err := h.repo.Create(c.Request().Context(), req.Name, req.Lat, req.Lng)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, city)
}
