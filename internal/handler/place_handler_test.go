package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"gotrip/internal/model"
	"gotrip/internal/repo"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.Place{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	db.Exec("DELETE FROM places")
	return db
}

func TestPlaceHandler_List_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	req := httptest.NewRequest(http.MethodGet, "/api/places", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Data     []model.Place `json:"data"`
		Total    int           `json:"total"`
		Page     int           `json:"page"`
		PageSize int           `json:"page_size"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Total != 0 {
		t.Errorf("expected total 0, got %d", resp.Total)
	}
	if len(resp.Data) != 0 {
		t.Errorf("expected empty data, got %d items", len(resp.Data))
	}
	if resp.Page != 1 {
		t.Errorf("expected page 1, got %d", resp.Page)
	}
	if resp.PageSize != 50 {
		t.Errorf("expected page_size 50, got %d", resp.PageSize)
	}
}

func TestPlaceHandler_List_WithPagination(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	for i := 0; i < 3; i++ {
		if err := db.Create(&model.Place{
			Name: "test-place-" + string(rune('A'+i)),
			Lng:  116.0 + float64(i),
			Lat:  39.0 + float64(i),
		}).Error; err != nil {
			t.Fatalf("failed to seed place: %v", err)
		}
	}

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	req := httptest.NewRequest(http.MethodGet, "/api/places?page=1&page_size=2", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Data     []model.Place `json:"data"`
		Total    int           `json:"total"`
		Page     int           `json:"page"`
		PageSize int           `json:"page_size"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Total)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
	if resp.Page != 1 || resp.PageSize != 2 {
		t.Errorf("expected page=1 page_size=2, got page=%d page_size=%d", resp.Page, resp.PageSize)
	}
}

func TestPlaceHandler_GetByID_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	req := httptest.NewRequest(http.MethodGet, "/api/places/999", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp APIError
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Error != "地点不存在" {
		t.Errorf("expected error message '地点不存在', got %q", resp.Error)
	}
}

func TestPlaceHandler_Delete(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	place := &model.Place{Name: "to-delete", Lng: 116.0, Lat: 39.0}
	if err := db.Create(place).Error; err != nil {
		t.Fatalf("failed to seed place: %v", err)
	}

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	req := httptest.NewRequest(http.MethodDelete, "/api/places/"+itoa(place.ID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Data struct {
			ID      uint `json:"id"`
			Deleted bool `json:"deleted"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if !resp.Data.Deleted {
		t.Errorf("expected deleted=true, got %v", resp.Data.Deleted)
	}
}

func itoa(id uint) string {
	const digits = "0123456789"
	if id == 0 {
		return "0"
	}
	var buf [20]byte
	pos := len(buf)
	for id > 0 {
		pos--
		buf[pos] = digits[id%10]
		id /= 10
	}
	return string(buf[pos:])
}

func TestPlaceHandler_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	body := `{"name":"成功地点","lng":114.0,"lat":22.5}`
	req := httptest.NewRequest(http.MethodPost, "/api/places", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Data model.Place `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Data.Name != "成功地点" {
		t.Errorf("expected name '成功地点', got %q", resp.Data.Name)
	}
	if resp.Data.Lng != 114.0 {
		t.Errorf("expected lng 114.0, got %v", resp.Data.Lng)
	}
	if resp.Data.Lat != 22.5 {
		t.Errorf("expected lat 22.5, got %v", resp.Data.Lat)
	}
}

func TestPlaceHandler_Create_DuplicatePlace(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	existing := &model.Place{
		Name: "测试地点",
		Lng:  114.0,
		Lat:  22.5,
	}
	if err := db.Create(existing).Error; err != nil {
		t.Fatalf("failed to seed place: %v", err)
	}

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	body := `{"name":"测试地点","lng":114.0001,"lat":22.5001}`
	req := httptest.NewRequest(http.MethodPost, "/api/places", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp APIError
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Error != "该地点已在心愿单中" {
		t.Errorf("expected error '该地点已在心愿单中', got %q", resp.Error)
	}
	if resp.Code != "DUPLICATE_PLACE" {
		t.Errorf("expected code 'DUPLICATE_PLACE', got %q", resp.Code)
	}
}

func TestPlaceHandler_Create_InvalidInput(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	body := `{"lng":114.0,"lat":22.5}`
	req := httptest.NewRequest(http.MethodPost, "/api/places", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp APIError
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if !strings.Contains(resp.Error, "name") {
		t.Errorf("expected error to contain 'name', got %q", resp.Error)
	}
}

func TestPlaceHandler_Update_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	place := &model.Place{Name: "更新测试", Lng: 114.0, Lat: 22.5}
	if err := db.Create(place).Error; err != nil {
		t.Fatalf("failed to seed place: %v", err)
	}

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	body := `{"tags":"[\"美食\",\"景点\"]","note":"更新后的备注"}`
	req := httptest.NewRequest(http.MethodPut, "/api/places/"+strconv.FormatUint(uint64(place.ID), 10), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Data model.Place `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Data.Tags != `["美食","景点"]` {
		t.Errorf("expected tags '[\"美食\",\"景点\"]', got %q", resp.Data.Tags)
	}
	if resp.Data.Note != "更新后的备注" {
		t.Errorf("expected note '更新后的备注', got %q", resp.Data.Note)
	}
}

func TestPlaceHandler_Update_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTestDB(t)

	placeRepo := repo.NewPlaceRepo(db)
	placeHandler := NewPlaceHandler(placeRepo)

	r := gin.New()
	placeHandler.RegisterRoutes(r)

	body := `{"tags":"[\"美食\"]","note":"备注"}`
	req := httptest.NewRequest(http.MethodPut, "/api/places/999", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", w.Code, w.Body.String())
	}
}
