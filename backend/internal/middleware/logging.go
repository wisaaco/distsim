package middleware

import (
	"bufio"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// statusWriter wraps http.ResponseWriter to capture the response status code.
// It also implements http.Hijacker so WebSocket upgrades work through the middleware.
type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (sw *statusWriter) WriteHeader(code int) {
	sw.status = code
	sw.ResponseWriter.WriteHeader(code)
}

func (sw *statusWriter) Write(b []byte) (int, error) {
	n, err := sw.ResponseWriter.Write(b)
	sw.bytes += n
	return n, err
}

// Hijack implements http.Hijacker, required for WebSocket upgrade.
func (sw *statusWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hj, ok := sw.ResponseWriter.(http.Hijacker); ok {
		return hj.Hijack()
	}
	return nil, nil, fmt.Errorf("underlying ResponseWriter does not implement http.Hijacker")
}

// RequestLogger returns middleware that logs each HTTP request with slog,
// including method, path, status code, duration, and response size.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)

		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"bytes", sw.bytes,
			"remote", r.RemoteAddr,
		)
	})
}
