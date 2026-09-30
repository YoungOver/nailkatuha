// Package httpapi exposes the booking API over HTTP.
package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/YoungOver/nailkatuha/server/internal/catalog"
)

type api struct {
	catalog *catalog.Catalog
}

// New wires the routes. Method-qualified patterns make the mux answer 405 by itself.
func New(c *catalog.Catalog) http.Handler {
	a := &api{catalog: c}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("GET /api/services", a.services)
	return mux
}

func (a *api) services(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=300")
	writeJSON(w, http.StatusOK, a.catalog.Services)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("write json", "err", err)
	}
}
