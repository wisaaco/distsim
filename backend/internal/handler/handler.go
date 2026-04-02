// Package handler implements the HTTP handlers for the DistSim API.
package handler

import (
	"github.com/hamidlabs/distsim/internal/chaos"
	"github.com/hamidlabs/distsim/internal/docker"
	"github.com/hamidlabs/distsim/internal/domain"
	"github.com/hamidlabs/distsim/internal/terminal"
	"github.com/hamidlabs/distsim/internal/typesys"
)

// Handler holds the dependencies needed by all HTTP handlers.
type Handler struct {
	docker   *docker.Client
	store    *domain.SessionStore
	checker  *typesys.Checker
	terminal *terminal.Manager
	chaos    *chaos.Engine
}

// New creates a Handler with all dependencies.
func New(docker *docker.Client, store *domain.SessionStore, checker *typesys.Checker, tm *terminal.Manager, ce *chaos.Engine) *Handler {
	return &Handler{
		docker:   docker,
		store:    store,
		checker:  checker,
		terminal: tm,
		chaos:    ce,
	}
}
