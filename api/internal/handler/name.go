package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/repository"
)

type NameHandler struct {
	repo *repository.NameRepo
}

func NewNameHandler(repo *repository.NameRepo) *NameHandler {
	return &NameHandler{repo: repo}
}

func (h *NameHandler) List(c echo.Context) error {
	names, err := h.repo.List(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, names)
}

func (h *NameHandler) Create(c echo.Context) error {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	name, err := h.repo.Create(c.Request().Context(), req.Name)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, name)
}
