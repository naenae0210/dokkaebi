package handler_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"hangwith/api/internal/handler"
	"hangwith/api/internal/model"
)

// --- PhotoHandler.List ---

func TestPhotoHandler_List_Success(t *testing.T) {
	now := time.Now()
	cardID := "card-1"
	mock := &mockPhotoRepo{
		listResult: []model.Photo{
			{ID: "photo-1", CardID: &cardID, URL: "/uploads/card-1/1.jpg", Visibility: "public", CreatedAt: now, UpdatedAt: now},
			{ID: "photo-2", CardID: &cardID, URL: "/uploads/card-1/2.jpg", Visibility: "public", CreatedAt: now, UpdatedAt: now},
		},
	}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cards/card-1/photos", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")

	h := handler.NewPhotoHandler(mock, &mockCardRepo{})
	require.NoError(t, h.List(c))

	assert.Equal(t, http.StatusOK, rec.Code)

	var result []model.Photo
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	assert.Len(t, result, 2)
	assert.Equal(t, "photo-1", result[0].ID)
}

func TestPhotoHandler_List_DBError(t *testing.T) {
	mock := &mockPhotoRepo{listErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodGet, "/api/cards/card-1/photos", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")

	h := handler.NewPhotoHandler(mock, &mockCardRepo{})
	err := h.List(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusInternalServerError, he.Code)
}

// --- PhotoHandler.Delete ---

func TestPhotoHandler_Delete_Unauthenticated(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/cards/card-1/photos/photo-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id", "photoId")
	c.SetParamValues("card-1", "photo-1")

	h := handler.NewPhotoHandler(&mockPhotoRepo{}, &mockCardRepo{})
	err := h.Delete(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusUnauthorized, he.Code)
}

func TestPhotoHandler_Delete_DBError(t *testing.T) {
	mock := &mockPhotoRepo{deleteErr: errDB}

	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/cards/card-1/photos/photo-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id", "photoId")
	c.SetParamValues("card-1", "photo-1")
	c = withUser(c, "user-1")

	h := handler.NewPhotoHandler(mock, &mockCardRepo{})
	err := h.Delete(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusForbidden, he.Code)
}

func TestPhotoHandler_Delete_Success(t *testing.T) {
	// deleteURL은 존재하지 않는 경로여도 됨 — handler가 os.Remove 실패를 무시함
	mock := &mockPhotoRepo{deleteURL: "/tmp/nonexistent-test-photo.jpg"}

	e := newEcho()
	req := httptest.NewRequest(http.MethodDelete, "/api/cards/card-1/photos/photo-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id", "photoId")
	c.SetParamValues("card-1", "photo-1")
	c = withUser(c, "user-1")

	h := handler.NewPhotoHandler(mock, &mockCardRepo{})
	require.NoError(t, h.Delete(c))

	assert.Equal(t, http.StatusNoContent, rec.Code)
}

// --- PhotoHandler.Upload ---

func TestPhotoHandler_Upload_Unauthenticated(t *testing.T) {
	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards/card-1/photos", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")

	h := handler.NewPhotoHandler(&mockPhotoRepo{}, &mockCardRepo{})
	err := h.Upload(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusUnauthorized, he.Code)
}

func TestPhotoHandler_Upload_NoFile(t *testing.T) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	w.Close()

	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards/card-1/photos", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")
	c = withUser(c, "user-1")

	h := handler.NewPhotoHandler(&mockPhotoRepo{}, &mockCardRepo{})
	err := h.Upload(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusBadRequest, he.Code)
}

func TestPhotoHandler_Upload_FileTooLarge(t *testing.T) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("file", "big.jpg")
	fw.Write(bytes.Repeat([]byte("x"), 10<<20+1)) // 10MB + 1 byte
	w.Close()

	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards/card-1/photos", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")
	c = withUser(c, "user-1")

	h := handler.NewPhotoHandler(&mockPhotoRepo{}, &mockCardRepo{})
	err := h.Upload(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusRequestEntityTooLarge, he.Code)
}

func TestPhotoHandler_Upload_NonImage(t *testing.T) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("file", "test.jpg")
	fw.Write([]byte("this is plain text, not an image")) // magic bytes 불일치
	w.Close()

	e := newEcho()
	req := httptest.NewRequest(http.MethodPost, "/api/cards/card-1/photos", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues("card-1")
	c = withUser(c, "user-1")

	h := handler.NewPhotoHandler(&mockPhotoRepo{}, &mockCardRepo{})
	err := h.Upload(c)

	var he *echo.HTTPError
	require.ErrorAs(t, err, &he)
	assert.Equal(t, http.StatusUnsupportedMediaType, he.Code)
}
