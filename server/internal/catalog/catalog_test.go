package catalog

import "testing"

func TestSeedLoads(t *testing.T) {
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Services) != 9 {
		t.Fatalf("services = %d, want 9", len(c.Services))
	}
	first := c.Services[0]
	if first.PriceRub != 1000 || first.DurationMin != 60 || first.Category != "Снятие" {
		t.Fatalf("first service = %+v", first)
	}
	for i := 1; i < len(c.Services); i++ {
		a, b := c.Services[i-1], c.Services[i]
		if a.CategoryOrder > b.CategoryOrder || (a.CategoryOrder == b.CategoryOrder && a.Order > b.Order) {
			t.Fatalf("not sorted at %d: %+v before %+v", i, a, b)
		}
	}
}

func TestByID(t *testing.T) {
	c, _ := Load()
	s, ok := c.ByID(3)
	if !ok || s.Name != "длина 1-2 + дизайн" {
		t.Fatalf("ByID(3) = %+v, %v", s, ok)
	}
	if _, ok := c.ByID(999); ok {
		t.Fatal("ByID(999) found a service")
	}
}
