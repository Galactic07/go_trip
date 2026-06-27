package main

import (
	"fmt"

	"gotrip/internal/config"
	"gotrip/internal/handler"
	"gotrip/internal/middleware"
	"gotrip/internal/model"
	"gotrip/internal/repo"
	"gotrip/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}

	logger, err := zap.NewProduction()
	if err != nil {
		panic(fmt.Sprintf("failed to init logger: %v", err))
	}
	defer logger.Sync()

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(fmt.Sprintf("failed to connect database: %v", err))
	}

	if err := db.AutoMigrate(&model.Place{}, &model.RoutePlan{}, &model.RoutePlanPlace{}); err != nil {
		panic(fmt.Sprintf("failed to auto migrate: %v", err))
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	handler.RegisterHealthRoutes(r)

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := handler.NewPlaceHandler(placeRepo)
	placeHandler.RegisterRoutes(r)

	amapService := service.NewAmapService(cfg.Amap.WebServiceKey)
	amapHandler := handler.NewAmapHandler(amapService)
	amapHandler.RegisterRoutes(r)

	routePlanRepo := repo.NewRoutePlanRepo(db)
	routePlanService := service.NewRoutePlanService(amapService)
	routePlanHandler := handler.NewRoutePlanHandler(routePlanRepo, placeRepo, routePlanService)
	routePlanHandler.RegisterRoutes(r)

	weatherService := service.NewWeatherService()
	weatherHandler := handler.NewWeatherHandler(weatherService)
	weatherHandler.RegisterRoutes(r)

	urlParseService := service.NewUrlParseService()
	urlParseHandler := handler.NewUrlParseHandler(urlParseService)
	urlParseHandler.RegisterRoutes(r)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	logger.Info("starting server", zap.String("addr", addr))
	if err := r.Run(addr); err != nil {
		panic(fmt.Sprintf("failed to start server: %v", err))
	}
}
