package model

import "fmt"

func ValidatePlace(p *Place) error {
	if p.Name == "" {
		return fmt.Errorf("name is required")
	}
	if p.Lng < -180 || p.Lng > 180 {
		return fmt.Errorf("invalid longitude")
	}
	if p.Lat < -90 || p.Lat > 90 {
		return fmt.Errorf("invalid latitude")
	}
	return nil
}
