package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool

func main() {
	var err error
	pool, err = pgxpool.New(context.Background(), mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	os.MkdirAll("/uploads", 0755)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Handle("/uploads/*", http.StripPrefix("/uploads", http.FileServer(http.Dir("/uploads"))))

	r.Get("/api/cards", listCards)
	r.Post("/api/cards", createCard)
	r.Put("/api/cards/{id}", updateCard)
	r.Post("/api/cards/{id}/places", replacePlaces)
	r.Post("/api/cards/{id}/photos", uploadPhoto)

	r.Get("/api/cities", listCities)
	r.Post("/api/cities", createCity)

	r.Get("/api/names", listNames)
	r.Post("/api/names", createName)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing env var: %s", key)
	}
	return v
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// --- Models ---

type City struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Country   string    `json:"country"`
	Lat       *float64  `json:"lat"`
	Lng       *float64  `json:"lng"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Place struct {
	ID        string    `json:"id"`
	CardID    *string   `json:"card_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Lat       *float64  `json:"lat"`
	Lng       *float64  `json:"lng"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Photo struct {
	ID        string    `json:"id"`
	CardID    *string   `json:"card_id"`
	URL       string    `json:"url"`
	Order     int       `json:"order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Card struct {
	ID         string    `json:"id"`
	CityID     *string   `json:"city_id"`
	City       *City     `json:"city"`
	Category   string    `json:"category"`
	Title      string    `json:"title"`
	CoverPhoto *string   `json:"cover_photo"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Places     []Place   `json:"places"`
	Photos     []Photo   `json:"photos"`
}

type Name struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// --- Cards ---

func listCards(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// cards + city via LEFT JOIN
	rows, err := pool.Query(ctx, `
		SELECT
			c.id, c.city_id, c.category, c.title, c.cover_photo, c.created_at, c.updated_at,
			ci.id, ci.name, ci.country, ci.lat, ci.lng, ci.created_at, ci.updated_at
		FROM cards c
		LEFT JOIN cities ci ON ci.id = c.city_id
		ORDER BY c.created_at DESC
	`)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	var cards []Card
	cardIdx := map[string]int{}
	for rows.Next() {
		var c Card
		c.Places = []Place{}
		c.Photos = []Photo{}
		var cityID, cityName, cityCountry *string
		var cityLat, cityLng *float64
		var cityCreatedAt, cityUpdatedAt *time.Time
		if err := rows.Scan(
			&c.ID, &c.CityID, &c.Category, &c.Title, &c.CoverPhoto, &c.CreatedAt, &c.UpdatedAt,
			&cityID, &cityName, &cityCountry, &cityLat, &cityLng, &cityCreatedAt, &cityUpdatedAt,
		); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		if cityID != nil {
			c.City = &City{
				ID: *cityID, Name: *cityName, Country: *cityCountry,
				Lat: cityLat, Lng: cityLng,
				CreatedAt: *cityCreatedAt, UpdatedAt: *cityUpdatedAt,
			}
		}
		cardIdx[c.ID] = len(cards)
		cards = append(cards, c)
	}
	rows.Close()

	if len(cards) == 0 {
		writeJSON(w, 200, []Card{})
		return
	}

	// places
	placeRows, err := pool.Query(ctx, `
		SELECT id, card_id, name, type, lat, lng, created_at, updated_at FROM places
	`)
	if err == nil {
		for placeRows.Next() {
			var p Place
			placeRows.Scan(&p.ID, &p.CardID, &p.Name, &p.Type, &p.Lat, &p.Lng, &p.CreatedAt, &p.UpdatedAt)
			if p.CardID != nil {
				if i, ok := cardIdx[*p.CardID]; ok {
					cards[i].Places = append(cards[i].Places, p)
				}
			}
		}
		placeRows.Close()
	}

	// photos
	photoRows, err := pool.Query(ctx, `
		SELECT id, card_id, url, "order", created_at, updated_at FROM photos ORDER BY "order"
	`)
	if err == nil {
		for photoRows.Next() {
			var p Photo
			photoRows.Scan(&p.ID, &p.CardID, &p.URL, &p.Order, &p.CreatedAt, &p.UpdatedAt)
			if p.CardID != nil {
				if i, ok := cardIdx[*p.CardID]; ok {
					cards[i].Photos = append(cards[i].Photos, p)
				}
			}
		}
		photoRows.Close()
	}

	writeJSON(w, 200, cards)
}

func createCard(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Category string  `json:"category"`
		Title    string  `json:"title"`
		CityID   *string `json:"city_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid body")
		return
	}

	var c Card
	c.Places = []Place{}
	c.Photos = []Photo{}
	err := pool.QueryRow(r.Context(), `
		INSERT INTO cards (id, category, title, city_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, city_id, category, title, cover_photo, created_at, updated_at
	`, uuid.New().String(), body.Category, body.Title, body.CityID).
		Scan(&c.ID, &c.CityID, &c.Category, &c.Title, &c.CoverPhoto, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	writeJSON(w, 201, c)
}

func updateCard(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Category string  `json:"category"`
		Title    string  `json:"title"`
		CityID   *string `json:"city_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid body")
		return
	}

	_, err := pool.Exec(r.Context(), `
		UPDATE cards SET category = $1, title = $2, city_id = $3, updated_at = now()
		WHERE id = $4
	`, body.Category, body.Title, body.CityID, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	w.WriteHeader(204)
}

func replacePlaces(w http.ResponseWriter, r *http.Request) {
	cardID := chi.URLParam(r, "id")
	var places []struct {
		Name string   `json:"name"`
		Type string   `json:"type"`
		Lat  *float64 `json:"lat"`
		Lng  *float64 `json:"lng"`
	}
	if err := json.NewDecoder(r.Body).Decode(&places); err != nil {
		writeError(w, 400, "invalid body")
		return
	}

	ctx := r.Context()
	tx, err := pool.Begin(ctx)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM places WHERE card_id = $1`, cardID); err != nil {
		writeError(w, 500, err.Error())
		return
	}

	for _, p := range places {
		if _, err := tx.Exec(ctx, `
			INSERT INTO places (id, card_id, name, type, lat, lng)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, uuid.New().String(), cardID, p.Name, p.Type, p.Lat, p.Lng); err != nil {
			writeError(w, 500, err.Error())
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, 500, err.Error())
		return
	}

	w.WriteHeader(204)
}

func uploadPhoto(w http.ResponseWriter, r *http.Request) {
	cardID := chi.URLParam(r, "id")

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, 400, "parse form failed")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, 400, "missing file")
		return
	}
	defer file.Close()

	order := 0
	fmt.Sscanf(r.FormValue("order"), "%d", &order)

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}

	dir := filepath.Join("/uploads", cardID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		writeError(w, 500, "mkdir failed")
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixMilli(), ext)
	out, err := os.Create(filepath.Join(dir, filename))
	if err != nil {
		writeError(w, 500, "create file failed")
		return
	}
	defer out.Close()
	io.Copy(out, file)

	url := fmt.Sprintf("/uploads/%s/%s", cardID, filename)
	ctx := r.Context()

	_, err = pool.Exec(ctx, `
		INSERT INTO photos (id, card_id, url, "order") VALUES ($1, $2, $3, $4)
	`, uuid.New().String(), cardID, url, order)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	pool.Exec(ctx, `UPDATE cards SET cover_photo = $1 WHERE id = $2 AND cover_photo IS NULL`, url, cardID)

	writeJSON(w, 201, map[string]string{"url": url})
}

// --- Cities ---

func listCities(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	search := r.URL.Query().Get("search")

	var rows pgx.Rows
	var err error
	if search != "" {
		rows, err = pool.Query(ctx, `
			SELECT id, name, country, lat, lng, created_at, updated_at
			FROM cities WHERE name ILIKE $1 LIMIT 1
		`, search)
	} else {
		rows, err = pool.Query(ctx, `
			SELECT id, name, country, lat, lng, created_at, updated_at
			FROM cities ORDER BY name
		`)
	}
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	var cities []City
	for rows.Next() {
		var c City
		rows.Scan(&c.ID, &c.Name, &c.Country, &c.Lat, &c.Lng, &c.CreatedAt, &c.UpdatedAt)
		cities = append(cities, c)
	}
	if cities == nil {
		cities = []City{}
	}
	writeJSON(w, 200, cities)
}

func createCity(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string   `json:"name"`
		Lat  *float64 `json:"lat"`
		Lng  *float64 `json:"lng"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid body")
		return
	}

	var c City
	err := pool.QueryRow(r.Context(), `
		INSERT INTO cities (id, name, lat, lng)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, country, lat, lng, created_at, updated_at
	`, uuid.New().String(), body.Name, body.Lat, body.Lng).
		Scan(&c.ID, &c.Name, &c.Country, &c.Lat, &c.Lng, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	writeJSON(w, 201, c)
}

// --- Names ---

func listNames(w http.ResponseWriter, r *http.Request) {
	rows, err := pool.Query(r.Context(), `SELECT id, name, created_at FROM names ORDER BY created_at`)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	var names []Name
	for rows.Next() {
		var n Name
		rows.Scan(&n.ID, &n.Name, &n.CreatedAt)
		names = append(names, n)
	}
	if names == nil {
		names = []Name{}
	}
	writeJSON(w, 200, names)
}

func createName(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, 400, "invalid body")
		return
	}

	var n Name
	err := pool.QueryRow(r.Context(), `
		INSERT INTO names (id, name) VALUES ($1, $2)
		RETURNING id, name, created_at
	`, uuid.New().String(), body.Name).Scan(&n.ID, &n.Name, &n.CreatedAt)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	writeJSON(w, 201, n)
}
