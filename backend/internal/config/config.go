// Package config handles application configuration loaded from environment variables.
package config

import (
	"log/slog"
	"os"
	"strconv"
)

// Config holds all configuration values for the DistSim server.
type Config struct {
	// Port is the HTTP server listen port.
	Port int
	// DockerHost overrides the Docker daemon socket (e.g. "unix:///var/run/docker.sock").
	// Empty string means use the default from the environment.
	DockerHost string
	// LogLevel controls the minimum log level: "debug", "info", "warn", "error".
	LogLevel slog.Level
}

// Load reads configuration from environment variables and returns a Config
// with sensible defaults for any values not set.
func Load() *Config {
	cfg := &Config{
		Port:       8080,
		DockerHost: "",
		LogLevel:   slog.LevelInfo,
	}

	if v := os.Getenv("PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			cfg.Port = p
		}
	}

	if v := os.Getenv("DOCKER_HOST"); v != "" {
		cfg.DockerHost = v
	}

	if v := os.Getenv("LOG_LEVEL"); v != "" {
		cfg.LogLevel = parseLogLevel(v)
	}

	return cfg
}

func parseLogLevel(s string) slog.Level {
	switch s {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
