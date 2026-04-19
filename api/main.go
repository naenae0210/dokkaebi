package main

import (
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"

	"hangwith/api/internal/handler"
	"hangwith/api/internal/repository"
)

func main() {
	db, err := sqlx.Connect("postgres", mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer db.Close()

	os.MkdirAll("/uploads", 0755)

	// repositories
	cardRepo := repository.NewCardRepo(db)
	cityRepo := repository.NewCityRepo(db)
	nameRepo := repository.NewNameRepo(db)
	photoRepo := repository.NewPhotoRepo(db)

	// handlers
	cardH := handler.NewCardHandler(cardRepo)
	cityH := handler.NewCityHandler(cityRepo)
	nameH := handler.NewNameHandler(nameRepo)
	photoH := handler.NewPhotoHandler(photoRepo, cardRepo)

	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.Static("/uploads", "/uploads")

	api := e.Group("/api")
	api.GET("/cards", cardH.List)
	api.POST("/cards", cardH.Create)
	api.PUT("/cards/:id", cardH.Update)
	api.POST("/cards/:id/places", cardH.ReplacePlaces)
	api.POST("/cards/:id/photos", photoH.Upload)
	api.GET("/cities", cityH.List)
	api.POST("/cities", cityH.Create)
	api.GET("/names", nameH.List)
	api.POST("/names", nameH.Create)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing env: %s", key)
	}
	return v
}
