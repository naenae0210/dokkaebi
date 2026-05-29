package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	appmw "hangwith/api/internal/middleware"
	"hangwith/api/internal/repository"
)

const maxUploadSize = 10 << 20 // 10 MB

type PhotoHandler struct {
	photoRepo repository.PhotoRepository
	cardRepo  repository.CardRepository
}

func NewPhotoHandler(photoRepo repository.PhotoRepository, cardRepo repository.CardRepository) *PhotoHandler {
	return &PhotoHandler{photoRepo: photoRepo, cardRepo: cardRepo}
}

func (h *PhotoHandler) List(c echo.Context) error {
	cardID := c.Param("id")
	userID := appmw.UserIDFromContext(c)
	photos, err := h.photoRepo.ListByCard(c.Request().Context(), cardID, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	return c.JSON(http.StatusOK, photos)
}

func (h *PhotoHandler) Delete(c echo.Context) error {
	photoID := c.Param("photoId")
	userID := appmw.UserIDFromContext(c)
	if userID == nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "login required")
	}
	url, err := h.photoRepo.DeleteByUploader(c.Request().Context(), photoID, *userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "not found or not your photo")
	}
	os.Remove(url)
	return c.NoContent(http.StatusNoContent)
}

func (h *PhotoHandler) Upload(c echo.Context) error {
	cardID := c.Param("id")
	ctx := c.Request().Context()

	userID := appmw.UserIDFromContext(c)
	if userID == nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "login required")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "missing file")
	}
	if file.Size > maxUploadSize {
		return echo.NewHTTPError(http.StatusRequestEntityTooLarge, "file too large (max 10MB)")
	}

	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to open upload")
	}
	defer src.Close()

	// Detect MIME type from first 512 bytes, then seek back
	var sniff [512]byte
	n, _ := src.Read(sniff[:])
	if ct := http.DetectContentType(sniff[:n]); !strings.HasPrefix(ct, "image/") {
		return echo.NewHTTPError(http.StatusUnsupportedMediaType, "only image files are allowed")
	}
	if _, err = src.Seek(0, io.SeekStart); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to read upload")
	}

	order := 0
	fmt.Sscanf(c.FormValue("order"), "%d", &order)

	visibility := c.FormValue("visibility")
	if visibility != "private" {
		visibility = "public"
	}

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

	if _, err = io.Copy(dst, src); err != nil {
		os.Remove(filepath.Join(dir, filename))
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to save file")
	}

	url := fmt.Sprintf("/uploads/%s/%s", cardID, filename)

	photo, err := h.photoRepo.Create(ctx, cardID, *userID, url, order, visibility)
	if err != nil {
		os.Remove(filepath.Join(dir, filename))
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}

	h.cardRepo.SetCoverPhoto(ctx, cardID, photo.ID)

	return c.JSON(http.StatusCreated, photo)
}
