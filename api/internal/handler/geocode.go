package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"

	"github.com/labstack/echo/v4"
)

type GeocodeHandler struct{}

func NewGeocodeHandler() *GeocodeHandler {
	return &GeocodeHandler{}
}

type geocodeResult struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

func (h *GeocodeHandler) Geocode(c echo.Context) error {
	address := c.QueryParam("address")
	if address == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "address is required")
	}
	if len(address) > 512 {
		return echo.NewHTTPError(http.StatusBadRequest, "address too long")
	}

	key := os.Getenv("GOOGLE_MAPS_KEY")
	apiURL := fmt.Sprintf(
		"https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s",
		url.QueryEscape(address), key,
	)

	resp, err := http.Get(apiURL) //nolint:gosec
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "geocode request failed")
	}
	defer resp.Body.Close()

	var payload struct {
		Results []struct {
			Geometry struct {
				Location struct {
					Lat float64 `json:"lat"`
					Lng float64 `json:"lng"`
				} `json:"location"`
			} `json:"geometry"`
		} `json:"results"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to parse geocode response")
	}

	if len(payload.Results) == 0 {
		return c.JSON(http.StatusOK, nil)
	}

	loc := payload.Results[0].Geometry.Location
	return c.JSON(http.StatusOK, geocodeResult{Lat: loc.Lat, Lng: loc.Lng})
}
