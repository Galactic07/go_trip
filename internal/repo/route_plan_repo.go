package repo

import (
	"gotrip/internal/model"

	"gorm.io/gorm"
)

type RoutePlanRepoInterface interface {
	List() ([]model.RoutePlan, error)
	GetByID(id uint) (*model.RoutePlan, error)
	Create(plan *model.RoutePlan) error
	Update(plan *model.RoutePlan) error
	Delete(id uint) error
	UpdateStatus(id uint, status string) error
}

type RoutePlanRepo struct {
	db *gorm.DB
}

func NewRoutePlanRepo(db *gorm.DB) *RoutePlanRepo {
	return &RoutePlanRepo{db: db}
}

func (r *RoutePlanRepo) List() ([]model.RoutePlan, error) {
	var plans []model.RoutePlan
	if err := r.db.
		Preload("Places").
		Preload("Places.Place").
		Order("created_at desc").
		Find(&plans).Error; err != nil {
		return nil, err
	}
	return plans, nil
}

func (r *RoutePlanRepo) GetByID(id uint) (*model.RoutePlan, error) {
	var plan model.RoutePlan
	if err := r.db.
		Preload("Places").
		Preload("Places.Place").
		First(&plan, id).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *RoutePlanRepo) Create(plan *model.RoutePlan) error {
	return r.db.Create(plan).Error
}

func (r *RoutePlanRepo) Update(plan *model.RoutePlan) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 先删除旧的关联地点
		if err := tx.Where("route_plan_id = ?", plan.ID).
			Delete(&model.RoutePlanPlace{}).Error; err != nil {
			return err
		}
		// 再更新路线计划
		if err := tx.Save(plan).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *RoutePlanRepo) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 先删除关联地点
		if err := tx.Where("route_plan_id = ?", id).
			Delete(&model.RoutePlanPlace{}).Error; err != nil {
			return err
		}
		// 再删除路线计划
		if err := tx.Delete(&model.RoutePlan{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *RoutePlanRepo) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.RoutePlan{}).
		Where("id = ?", id).
		Update("status", status).Error
}
