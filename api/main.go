package main

import (
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"

	"hangwith/api/internal/handler"
	appmw "hangwith/api/internal/middleware"
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
	userRepo     := repository.NewUserRepo(db)
	cardRepo     := repository.NewCardRepo(db)
	cityRepo     := repository.NewCityRepo(db)
	nameRepo     := repository.NewNameRepo(db)
	photoRepo    := repository.NewPhotoRepo(db)
	categoryRepo := repository.NewCategoryRepo(db)
	placeTypeRepo := repository.NewPlaceTypeRepo(db)

	// handlers
	authH        := handler.NewAuthHandler(userRepo)
	cardH        := handler.NewCardHandler(cardRepo)
	cityH        := handler.NewCityHandler(cityRepo)
	nameH        := handler.NewNameHandler(nameRepo)
	photoH       := handler.NewPhotoHandler(photoRepo, cardRepo)
	categoryH    := handler.NewCategoryHandler(categoryRepo)
	placeTypeH   := handler.NewPlaceTypeHandler(placeTypeRepo)

	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.Static("/uploads", "/uploads")

	// auth routes (no JWT required — these establish the session)
	auth := e.Group("/api/auth")
	auth.Use(appmw.JWTOptional)
	auth.GET("/google", authH.GoogleLogin)
	auth.GET("/google/callback", authH.GoogleCallback)
	auth.GET("/me", authH.Me)
	auth.GET("/nicknames", authH.Nicknames)
	auth.POST("/logout", authH.Logout)

	// account deletion — requires authentication
	authWrite := e.Group("/api/auth")
	authWrite.Use(appmw.JWTRequired)
	authWrite.DELETE("/me", authH.DeleteAccount)

	// read-only routes — guests allowed
	apiRead := e.Group("/api")
	apiRead.Use(appmw.JWTOptional)
	apiRead.GET("/cards",       cardH.List)
	apiRead.GET("/cities",      cityH.List)
	apiRead.GET("/names",       nameH.List)
	apiRead.GET("/categories",  categoryH.List)
	apiRead.GET("/place-types", placeTypeH.List)

	// write routes — must be authenticated
	apiWrite := e.Group("/api")
	apiWrite.Use(appmw.JWTRequired)
	apiWrite.POST  ("/cards",                     cardH.Create)
	apiWrite.PUT   ("/cards/reorder",             cardH.Reorder)
	apiWrite.PUT   ("/cards/:id",                 cardH.Update)
	apiWrite.DELETE("/cards/:id",                 cardH.Delete)
	apiWrite.POST  ("/cards/:id/places",          cardH.ReplacePlaces)
	apiWrite.POST  ("/cards/:id/photos",          photoH.Upload)
	apiWrite.DELETE("/cards/:id/photos/:photoId", photoH.Delete)
	apiWrite.POST  ("/cities",                    cityH.Create)
	apiWrite.POST  ("/names",                     nameH.Create)
	apiWrite.POST  ("/categories",                categoryH.Create)
	apiWrite.DELETE("/categories/:id",            categoryH.Delete)
	apiWrite.POST  ("/place-types",               placeTypeH.Create)
	apiWrite.DELETE("/place-types/:id",           placeTypeH.Delete)

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
