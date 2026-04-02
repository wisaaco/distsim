package handler

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

type apiTestRequest struct {
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	Count       int               `json:"count"`       // >1 = bulk mode
	Concurrency int               `json:"concurrency"` // parallel workers
}

type apiTestResponse struct {
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Duration   string            `json:"duration"`
	Error      string            `json:"error,omitempty"`
}

type bulkTestResponse struct {
	TotalRequests int            `json:"total_requests"`
	Successful    int            `json:"successful"`
	Failed        int            `json:"failed"`
	TotalDuration string         `json:"total_duration"`
	AvgDuration   string         `json:"avg_duration"`
	ReqPerSecond  float64        `json:"req_per_second"`
	StatusCodes   map[string]int `json:"status_codes"`
	Error         string         `json:"error,omitempty"`
}

// APITest handles POST /api/sessions/{id}/machines/{mid}/api-test.
func (h *Handler) APITest(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	machineID := chi.URLParam(r, "mid")
	ctx := r.Context()

	sess, err := h.store.Get(sessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	var containerID string
	for _, m := range sess.Machines {
		if m.ID == machineID {
			containerID = m.ContainerID
			break
		}
	}
	if containerID == "" {
		writeError(w, http.StatusNotFound, "machine not found")
		return
	}

	var req apiTestRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}
	if req.Method == "" {
		req.Method = "GET"
	}

	if req.Count > 1 {
		h.doBulkTest(w, ctx, containerID, req)
		return
	}
	h.doSingleTest(w, ctx, containerID, req)
}

func (h *Handler) doSingleTest(w http.ResponseWriter, ctx context.Context, containerID string, req apiTestRequest) {
	cmd := buildSingleCurl(req)
	output, _, err := h.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		writeJSON(w, http.StatusOK, apiTestResponse{Error: "exec failed: " + err.Error()})
		return
	}

	resp := parseSingle(output)
	slog.Info("api test", "method", req.Method, "url", req.URL, "status", resp.StatusCode)
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) doBulkTest(w http.ResponseWriter, ctx context.Context, containerID string, req apiTestRequest) {
	conc := req.Concurrency
	if conc < 1 {
		conc = 1
	}
	if conc > 50 {
		conc = 50
	}
	count := req.Count
	if count > 10000 {
		count = 10000
	}

	curlCmd := buildBulkCurl(req)
	// Use a temp script file to avoid shell quoting issues with xargs
	script := fmt.Sprintf(
		`echo '%s' > /tmp/ds-bulk.sh && chmod +x /tmp/ds-bulk.sh && START=$(date +%%s%%N); seq 1 %d | xargs -P %d -I{} sh /tmp/ds-bulk.sh 2>/dev/null; END=$(date +%%s%%N); echo "---BULK---"; echo "$((($END - $START) / 1000000))"`,
		strings.ReplaceAll(curlCmd, "'", `'"'"'`), count, conc,
	)

	output, _, err := h.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", script})
	if err != nil {
		writeJSON(w, http.StatusOK, bulkTestResponse{Error: "exec failed: " + err.Error()})
		return
	}

	resp := parseBulk(output, count)
	slog.Info("bulk test", "url", req.URL, "count", count, "rps", resp.ReqPerSecond)
	writeJSON(w, http.StatusOK, resp)
}

func buildSingleCurl(req apiTestRequest) string {
	parts := []string{"curl", "-s", "-S", "-X", strings.ToUpper(req.Method)}
	parts = append(parts, "-w", `'\n---META---\n%{http_code}\n%{time_total}'`)
	parts = append(parts, "-D", "/tmp/ds-hdr.txt")

	for k, v := range req.Headers {
		parts = append(parts, "-H", fmt.Sprintf("'%s: %s'", k, v))
	}
	if req.Body != "" && req.Method != "GET" && req.Method != "DELETE" {
		escaped := strings.ReplaceAll(req.Body, "'", `'"'"'`)
		parts = append(parts, "-d", fmt.Sprintf("'%s'", escaped))
		if _, ok := req.Headers["Content-Type"]; !ok {
			parts = append(parts, "-H", "'Content-Type: application/json'")
		}
	}
	parts = append(parts, fmt.Sprintf("'%s'", req.URL))

	return strings.Join(parts, " ") + "; echo '---HDR---'; cat /tmp/ds-hdr.txt 2>/dev/null"
}

func buildBulkCurl(req apiTestRequest) string {
	// Build a simple curl command that outputs just the HTTP status code.
	// This runs inside: sh -c '...' via xargs, so avoid complex quoting.
	parts := []string{"curl", "-s", "-o", "/dev/null", "-w", `%{http_code}\n`, "-X", strings.ToUpper(req.Method)}
	for k, v := range req.Headers {
		parts = append(parts, "-H", fmt.Sprintf("%s: %s", k, v))
	}
	if req.Body != "" && req.Method != "GET" && req.Method != "DELETE" {
		parts = append(parts, "-d", req.Body)
	}
	parts = append(parts, req.URL)
	return strings.Join(parts, " ")
}

func parseSingle(output string) apiTestResponse {
	resp := apiTestResponse{Headers: make(map[string]string)}
	meta := "---META---"
	hdr := "---HDR---"

	metaIdx := strings.LastIndex(output, meta)
	if metaIdx < 0 {
		resp.Body = output
		return resp
	}

	resp.Body = output[:metaIdx]
	rest := output[metaIdx+len(meta)+1:]

	hdrIdx := strings.Index(rest, hdr)
	var metaPart string
	if hdrIdx >= 0 {
		metaPart = strings.TrimSpace(rest[:hdrIdx])
		for _, line := range strings.Split(strings.TrimSpace(rest[hdrIdx+len(hdr):]), "\n") {
			line = strings.TrimSpace(line)
			if i := strings.Index(line, ":"); i > 0 {
				resp.Headers[strings.TrimSpace(line[:i])] = strings.TrimSpace(line[i+1:])
			}
		}
	} else {
		metaPart = strings.TrimSpace(rest)
	}

	lines := strings.Split(metaPart, "\n")
	if len(lines) >= 1 {
		fmt.Sscanf(lines[0], "%d", &resp.StatusCode)
	}
	if len(lines) >= 2 {
		resp.Duration = strings.TrimSpace(lines[1]) + "s"
	}
	return resp
}

func parseBulk(output string, total int) bulkTestResponse {
	resp := bulkTestResponse{TotalRequests: total, StatusCodes: make(map[string]int)}
	sep := "---BULK---"
	idx := strings.LastIndex(output, sep)

	var statusPart string
	if idx >= 0 {
		statusPart = output[:idx]
		var ms int64
		fmt.Sscanf(strings.TrimSpace(output[idx+len(sep):]), "%d", &ms)
		resp.TotalDuration = fmt.Sprintf("%dms", ms)
		if total > 0 {
			resp.AvgDuration = fmt.Sprintf("%.1fms", float64(ms)/float64(total))
		}
		if ms > 0 {
			resp.ReqPerSecond = float64(total) / (float64(ms) / 1000.0)
		}
	} else {
		statusPart = output
	}

	for _, line := range strings.Split(statusPart, "\n") {
		code := strings.TrimSpace(line)
		if len(code) == 3 && code[0] >= '1' && code[0] <= '5' {
			resp.StatusCodes[code]++
			if code[0] == '2' {
				resp.Successful++
			} else {
				resp.Failed++
			}
		}
	}
	return resp
}
