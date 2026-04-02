package handler

import (
	"net/http"
)

// Health returns basic service information. It always succeeds — use Ready
// to check whether the server can actually serve traffic.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": "0.1.0",
	})
}

// Ready checks that the Docker daemon is reachable. Returns 200 if the
// server is fully operational, 503 if Docker is unavailable.
func (h *Handler) Ready(w http.ResponseWriter, r *http.Request) {
	if err := h.docker.Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not_ready",
			"reason": err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ready",
	})
}
