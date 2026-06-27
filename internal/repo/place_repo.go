package repo

import (
	"math"
	"time"

	"gotrip/internal/model"

	"gorm.io/gorm"
)

type PlaceRepoInterface interface {
	List(offset, limit int) ([]model.Place, error)
	ListByStatus(status string, offset, limit int) ([]model.Place, error)
	Create(place *model.Place) error
	GetByID(id uint) (*model.Place, error)
	Update(place *model.Place) error
	UpdateStatus(id uint, status model.PlaceStatus, visitedAt *time.Time) error
	BatchUpdateStatus(ids []uint, status model.PlaceStatus) error
	Delete(id uint) error
	FindByNameAndLocation(name string, lng, lat float64) (*model.Place, error)
	FindNearby(city string, lng, lat float64) ([]model.Place, error)
}

type PlaceRepo struct {
	db *gorm.DB
}

func NewPlaceRepo(db *gorm.DB) *PlaceRepo {
	return &PlaceRepo{db: db}
}

func (r *PlaceRepo) List(offset, limit int) ([]model.Place, error) {
	var places []model.Place
	query := r.db.Order("created_at desc")
	if offset > 0 {
		query = query.Offset(offset)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&places).Error; err != nil {
		return nil, err
	}
	return places, nil
}

func (r *PlaceRepo) Create(place *model.Place) error {
	if err := model.ValidatePlace(place); err != nil {
		return err
	}
	return r.db.Create(place).Error
}

func (r *PlaceRepo) GetByID(id uint) (*model.Place, error) {
	var place model.Place
	if err := r.db.First(&place, id).Error; err != nil {
		return nil, err
	}
	return &place, nil
}

func (r *PlaceRepo) Update(place *model.Place) error {
	updates := map[string]interface{}{
		"tags":          place.Tags,
		"note":          place.Note,
		"status":        place.Status,
		"stay_duration": place.StayDuration,
		"scene_type":    place.SceneType,
	}
	if place.VisitedAt != nil {
		updates["visited_at"] = place.VisitedAt
	}
	if place.EstimatedCost != nil {
		updates["estimated_cost"] = place.EstimatedCost
	}
	return r.db.Model(&model.Place{}).Where("id = ?", place.ID).Updates(updates).Error
}

func (r *PlaceRepo) Delete(id uint) error {
	return r.db.Delete(&model.Place{}, id).Error
}

func (r *PlaceRepo) FindByNameAndLocation(name string, lng, lat float64) (*model.Place, error) {
	var places []model.Place
	if err := r.db.Where("name = ?", name).Find(&places).Error; err != nil {
		return nil, err
	}
	for i := range places {
		if haversine(lat, lng, places[i].Lat, places[i].Lng) < 100 {
			return &places[i], nil
		}
	}
	return nil, nil
}

func (r *PlaceRepo) FindNearby(city string, lng, lat float64) ([]model.Place, error) {
	var places []model.Place
	if err := r.db.Where("city = ?", city).Find(&places).Error; err != nil {
		return nil, err
	}
	nearby := make([]model.Place, 0)
	for _, place := range places {
		if haversine(lat, lat, place.Lat, place.Lng) < 100 {
			nearby = append(nearby, place)
		}
	}
	return nearby, nil
}

func (r *PlaceRepo) ListByStatus(status string, offset, limit int) ([]model.Place, error) {
	var places []model.Place
	query := r.db.Where("status = ?", status).Order("created_at desc")
	if offset > 0 {
		query = query.Offset(offset)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&places).Error; err != nil {
		return nil, err
	}
	return places, nil
}

func (r *PlaceRepo) UpdateStatus(id uint, status model.PlaceStatus, visitedAt *time.Time) error {
	updates := map[string]interface{}{"status": status}
	if visitedAt != nil {
		updates["visited_at"] = visitedAt
	}
	return r.db.Model(&model.Place{}).Where("id = ?", id).Updates(updates).Error
}

func (r *PlaceRepo) BatchUpdateStatus(ids []uint, status model.PlaceStatus) error {
	return r.db.Model(&model.Place{}).Where("id IN ?", ids).Update("status", status).Error
}

func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371000
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) + math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}
