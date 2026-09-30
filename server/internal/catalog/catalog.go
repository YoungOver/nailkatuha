// Package catalog holds the studio's services and prices.
package catalog

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
)

// Service is one line of the price list. JSON names match the web client.
type Service struct {
	ID            int    `json:"id"`
	Category      string `json:"category"`
	CategoryOrder int    `json:"categoryOrder"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	PriceRub      int    `json:"priceRub"`
	DurationMin   int    `json:"durationMin"`
	Order         int    `json:"order"`
}

type Catalog struct {
	Services []Service
	byID     map[int]Service
}

//go:embed seed.json
var seed []byte

// Load reads the embedded price list, sorted by category and then by position.
func Load() (*Catalog, error) {
	var services []Service
	if err := json.Unmarshal(seed, &services); err != nil {
		return nil, fmt.Errorf("catalog seed: %w", err)
	}
	sort.SliceStable(services, func(i, j int) bool {
		a, b := services[i], services[j]
		if a.CategoryOrder != b.CategoryOrder {
			return a.CategoryOrder < b.CategoryOrder
		}
		return a.Order < b.Order
	})
	c := &Catalog{Services: services, byID: make(map[int]Service, len(services))}
	for _, s := range services {
		c.byID[s.ID] = s
	}
	return c, nil
}

func (c *Catalog) ByID(id int) (Service, bool) {
	s, ok := c.byID[id]
	return s, ok
}
