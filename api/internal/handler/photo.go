package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/repository"
)

type PhotoHandler struct {
	photoRepo repository.PhotoRepository
	cardRepo  repository.CardRepository
}

func NewPhotoHandler(photoRepo repository.PhotoRepository, cardRepo repository.CardRepository) *PhotoHandler {
	return &PhotoHandler{photoRepo: photoRepo, cardRepo: cardRepo}
}

func (h *PhotoHandler) Upload(c echo.Context) error {
	cardID := c.Param("id")
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "missing file")
	}

	order := 0
	fmt.Sscanf(c.FormValue("order"), "%d", &order)

	// "public" or "private" — default to public
	visibility := c.FormValue("visibility")
	if visibility != "private" {
		visibility = "public"
	}

	// save to disk
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	dir := filepath.Join("/uploads", cardID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create upload dir")
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixMilli(), ext)
	dst, err := os.Create(filepath.Join(dir, filename))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create file")
	}
	defer dst.Close()

	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to open upload")
	}
	defer src.Close()
	io.Copy(dst, src)

	url := fmt.Sprintf("/uploads/%s/%s", cardID, filename)

	photo, err := h.photoRepo.Create(ctx, cardID, url, order, visibility)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// set cover photo if card doesn't have one yet
	h.cardRepo.SetCoverPhoto(ctx, cardID, url)

	return c.JSON(http.StatusCreated, photo)
}
