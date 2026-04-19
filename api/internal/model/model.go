package model

import "time"

type City struct {
	ID        string    `db:"id"         json:"id"`
	Name      string    `db:"name"       json:"name"`
	Country   string    `db:"country"    json:"country"`
	Lat       *float64  `db:"lat"        json:"lat"`
	Lng       *float64  `db:"lng"        json:"lng"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type Place struct {
	ID        string    `db:"id"         json:"id"`
	CardID    *string   `db:"card_id"    json:"card_id"`
	Name      string    `db:"name"       json:"name"`
	Type      string    `db:"type"       json:"type"`
	Lat       *float64  `db:"lat"        json:"lat"`
	Lng       *float64  `db:"lng"        json:"lng"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type Photo struct {
	ID        string    `db:"id"         json:"id"`
	CardID    *string   `db:"card_id"    json:"card_id"`
	URL       string    `db:"url"        json:"url"`
	Order     int       `db:"order"      json:"order"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type Card struct {
	ID         string    `db:"id"          json:"id"`
	CityID     *string   `db:"city_id"     json:"city_id"`
	Category   string    `db:"category"    json:"category"`
	Title      string    `db:"title"       json:"title"`
	CoverPhoto *string   `db:"cover_photo" json:"cover_photo"`
	CreatedAt  time.Time `db:"created_at"  json:"created_at"`
	UpdatedAt  time.Time `db:"updated_at"  json:"updated_at"`
	City       *City     `db:"-"           json:"city"`
	Places     []Place   `db:"-"           json:"places"`
	Photos     []Photo   `db:"-"           json:"photos"`
}

type Name struct {
	ID        string    `db:"id"         json:"id"`
	Name      string    `db:"name"       json:"name"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// PlaceInput is used for creating/replacing places
type PlaceInput struct {
	Name string   `json:"name"`
	Type string   `json:"type"`
	Lat  *float64 `json:"lat"`
	Lng  *float64 `json:"lng"`
}
