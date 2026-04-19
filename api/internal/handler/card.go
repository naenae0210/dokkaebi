package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/model"
	"hangwith/api/internal/repository"
)

type CardHandler struct {
	repo *repository.CardRepo
}

func NewCardHandler(repo *repository.CardRepo) *CardHandler {
	return &CardHandler{repo: repo}
}

func (h *CardHandler) List(c echo.Context) error {
	cards, err := h.repo.List(c.Request().Context())
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, cards)
}

func (h *CardHandler) Create(c echo.Context) error {
	var req struct {
		Category string  `json:"category"`
		Title    string  `json:"title"`
		CityID   *string `json:"city_id"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	card, err := h.repo.Create(c.Request().Context(), req.Category, req.Title, req.CityID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, card)
}

func (h *CardHandler) Update(c echo.Context) error {
	id := c.Param("id")
	var req struct {
		Category string  `json:"category"`
		Title    string  `json:"title"`
		CityID   *string `json:"city_id"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if err := h.repo.Update(c.Request().Context(), id, req.Category, req.Title, req.CityID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *CardHandler) ReplacePlaces(c echo.Context) error {
	cardID := c.Param("id")

	var places []model.PlaceInput
	if err := c.Bind(&places); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if err := h.repo.ReplacePlaces(c.Request().Context(), cardID, places); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
