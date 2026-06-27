package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// StringArray is a custom type for storing string arrays as JSON in database
type StringArray []string

func (s StringArray) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	return json.Marshal(s)
}

func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed")
	}
	return json.Unmarshal(bytes, s)
}

type SceneType string

const (
	SceneTypeOutdoor SceneType = "outdoor"
	SceneTypeIndoor  SceneType = "indoor"
	SceneTypeHybrid  SceneType = "hybrid"
	SceneTypeUnknown SceneType = "unknown"
)

type PlaceStatus string

const (
	PlaceStatusWishlist  PlaceStatus = "wishlist"
	PlaceStatusVisited   PlaceStatus = "visited"
	PlaceStatusPending   PlaceStatus = "pending"
	PlaceStatusAbandoned PlaceStatus = "abandoned"
)

type Place struct {
	ID            uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	Name          string      `gorm:"type:varchar(200);not null" json:"name"`
	Address       string      `gorm:"type:varchar(500)" json:"address"`
	Lng           float64     `gorm:"type:decimal(10,7);not null" json:"lng"`
	Lat           float64     `gorm:"type:decimal(10,7);not null" json:"lat"`
	Province      string      `gorm:"type:varchar(50);not null;default:''" json:"province"`
	City          string      `gorm:"type:varchar(50);not null;default:''" json:"city"`
	District      string      `gorm:"type:varchar(50);not null;default:''" json:"district"`
	Street        string      `gorm:"type:varchar(50);not null;default:''" json:"street"`
	Adcode        string      `gorm:"type:varchar(20);not null;default:''" json:"adcode"`
	Tags          StringArray `gorm:"type:json" json:"tags"`
	Note          string      `gorm:"type:varchar(500)" json:"note"`
	Status        PlaceStatus `gorm:"type:varchar(20);not null;default:'wishlist'" json:"status"`
	VisitedAt     *time.Time  `json:"visited_at"`
	StayDuration  int         `gorm:"not null;default:60" json:"stay_duration"`                      // 预计停留时长（分钟）
	EstimatedCost *int        `json:"estimated_cost"`                                                // 预估人均费用（元）
	SceneType     SceneType   `gorm:"type:varchar(20);not null;default:'unknown'" json:"scene_type"` // 场景类型
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

func (Place) TableName() string {
	return "places"
}

type RoutePlan struct {
	ID            uint             `gorm:"primaryKey;autoIncrement" json:"id"`
	Title         string           `gorm:"type:varchar(200);not null" json:"title"`
	Status        string           `gorm:"type:varchar(20);not null;default:'planned'" json:"status"`
	EstimatedTime *int             `json:"estimated_time"`
	Places        []RoutePlanPlace `gorm:"foreignKey:RoutePlanID" json:"places"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

func (RoutePlan) TableName() string {
	return "route_plans"
}

type RoutePlanPlace struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	RoutePlanID   uint      `gorm:"not null;index" json:"route_plan_id"`
	PlaceID       uint      `gorm:"not null;index" json:"place_id"`
	Place         Place     `gorm:"foreignKey:PlaceID" json:"place"`
	SortOrder     int       `gorm:"not null;default:0" json:"sort_order"`
	DriveDistance *int      `json:"drive_distance"`
	DriveDuration *int      `json:"drive_duration"`
	WalkDistance  *int      `json:"walk_distance"`
	WalkDuration  *int      `json:"walk_duration"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (RoutePlanPlace) TableName() string {
	return "route_plan_places"
}
