package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// writeJSON serializes data as JSON and writes it to the response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// At this point headers are already sent — log and move on.
		http.Error(w, "", http.StatusInternalServerError)
	}
}

// readJSON decodes the request body into v. Returns an error suitable for user display.
func readJSON(r *http.Request, v any) error {
	if r.Body == nil {
		return fmt.Errorf("request body is empty")
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	return nil
}

// errorResponse is the standard error payload returned by the API.
type errorResponse struct {
	Error string `json:"error"`
}

// writeError writes a JSON error response with the given HTTP status and message.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}
