package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/repository"
)

type CategoryHandler struct {
	repo repository.CategoryRepository
}

func NewCategoryHandler(repo repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{repo: repo}
}

func (h *CategoryHandler) List(c echo.Context) error {
	cats, err := h.repo.List(c.Request().Context())
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.JSON(http.StatusOK, cats)
}

func (h *CategoryHandler) Create(c echo.Context) error {
	var req struct {
		ID        string `json:"id"`
		Label     string `json:"label"`
		Emoji     string `json:"emoji"`
		SortOrder int    `json:"sort_order"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	if req.ID == "" || req.Label == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "id and label are required")
	}
	cat, err := h.repo.Create(c.Request().Context(), req.ID, req.Label, req.Emoji, req.SortOrder)
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.JSON(http.StatusCreated, cat)
}

func (h *CategoryHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := h.repo.Delete(c.Request().Context(), id); err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.NoContent(http.StatusNoContent)
}

// --- PlaceTypeHandler ---

type PlaceTypeHandler struct {
	repo repository.PlaceTypeRepository
}

func NewPlaceTypeHandler(repo repository.PlaceTypeRepository) *PlaceTypeHandler {
	return &PlaceTypeHandler{repo: repo}
}

func (h *PlaceTypeHandler) List(c echo.Context) error {
	pts, err := h.repo.List(c.Request().Context())
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.JSON(http.StatusOK, pts)
}

func (h *PlaceTypeHandler) Create(c echo.Context) error {
	var req struct {
		ID        string `json:"id"`
		Label     string `json:"label"`
		Color     string `json:"color"`
		SortOrder int    `json:"sort_order"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	if req.ID == "" || req.Label == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "id and label are required")
	}
	pt, err := h.repo.Create(c.Request().Context(), req.ID, req.Label, req.Color, req.SortOrder)
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.JSON(http.StatusCreated, pt)
}

func (h *PlaceTypeHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := h.repo.Delete(c.Request().Context(), id); err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.NoContent(http.StatusNoContent)
}
