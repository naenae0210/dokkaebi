package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/repository"
)

type CityHandler struct {
	repo repository.CityRepository
}

func NewCityHandler(repo repository.CityRepository) *CityHandler {
	return &CityHandler{repo: repo}
}

// List returns all cities, searches by coordinates when ?lat=&lng= are provided
// (takes priority to prevent multilingual duplicates), or searches by name when ?search= is provided.
func (h *CityHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	latParam := c.QueryParam("lat")
	lngParam := c.QueryParam("lng")
	search := c.QueryParam("search")

	if latParam != "" && lngParam != "" {
		lat, errLat := strconv.ParseFloat(latParam, 64)
		lng, errLng := strconv.ParseFloat(lngParam, 64)
		if errLat == nil && errLng == nil {
			city, err := h.repo.FindByCoords(ctx, lat, lng)
			if err == nil {
				return c.JSON(http.StatusOK, []any{city})
			}
			if !errors.Is(err, sql.ErrNoRows) {
				c.Logger().Error(err)
				return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
			}
			return c.JSON(http.StatusOK, []any{})
		}
	}

	if search != "" {
		city, err := h.repo.FindByName(ctx, search)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return c.JSON(http.StatusOK, []any{})
			}
			c.Logger().Error(err)
			return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
		}
		return c.JSON(http.StatusOK, []any{city})
	}

	cities, err := h.repo.List(ctx)
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
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
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.JSON(http.StatusCreated, city)
}
