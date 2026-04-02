package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/hamidlabs/distsim/internal/domain"
)

// ListTemplates handles GET /api/templates.
// It returns all available template definitions so the frontend can display
// them in a template picker with full machine/service/connection details.
func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	templates := make([]domain.TemplateDef, 0, len(domain.TemplateRegistry))
	for _, t := range domain.TemplateRegistry {
		templates = append(templates, t)
	}
	writeJSON(w, http.StatusOK, templates)
}

// GetTemplate handles GET /api/templates/{id}.
// It returns a single template definition with full machine, service, and
// connection details.
func (h *Handler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tmpl, ok := domain.TemplateRegistry[id]
	if !ok {
		writeError(w, http.StatusNotFound, "template not found: "+id)
		return
	}

	writeJSON(w, http.StatusOK, tmpl)
}
