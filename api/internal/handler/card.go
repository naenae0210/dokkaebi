package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	appmw "hangwith/api/internal/middleware"
	"hangwith/api/internal/model"
	"hangwith/api/internal/repository"
)

type CardHandler struct {
	repo repository.CardRepository
}

func NewCardHandler(repo repository.CardRepository) *CardHandler {
	return &CardHandler{repo: repo}
}

func (h *CardHandler) List(c echo.Context) error {
	currentUserID := appmw.UserIDFromContext(c)
	cards, err := h.repo.List(c.Request().Context(), currentUserID)
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

	userID := appmw.UserIDFromContext(c)
	card, err := h.repo.Create(c.Request().Context(), req.Category, req.Title, req.CityID, userID)
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
