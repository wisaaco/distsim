package chaos

import (
	"context"
	"fmt"
)

// injectNetworkDelay adds latency to all outbound traffic on eth0 using
// tc qdisc netem. Params: "delay" (e.g. "200ms"), "jitter" (e.g. "50ms", optional).
func (e *Engine) injectNetworkDelay(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	delay := params["delay"]
	if delay == "" {
		return "", fmt.Errorf("param 'delay' is required for network_delay")
	}

	cmd := fmt.Sprintf("tc qdisc add dev eth0 root netem delay %s", delay)
	if jitter := params["jitter"]; jitter != "" {
		cmd += " " + jitter
	}

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing tc delay: %w", err)
	}
	if exitCode != 0 {
		return "", fmt.Errorf("tc delay command exited with code %d", exitCode)
	}

	return "tc qdisc del dev eth0 root netem", nil
}

// injectNetworkLoss drops a percentage of packets using tc qdisc netem.
// Params: "loss" (e.g. "30" for 30%).
func (e *Engine) injectNetworkLoss(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	loss := params["loss"]
	if loss == "" {
		return "", fmt.Errorf("param 'loss' is required for network_loss")
	}

	cmd := fmt.Sprintf("tc qdisc add dev eth0 root netem loss %s%%", loss)

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing tc loss: %w", err)
	}
	if exitCode != 0 {
		return "", fmt.Errorf("tc loss command exited with code %d", exitCode)
	}

	return "tc qdisc del dev eth0 root netem", nil
}

// injectNetworkPartition blocks all traffic to/from a specific IP using
// iptables INPUT and OUTPUT rules. Params: "target_ip" (e.g. "10.100.1.3").
func (e *Engine) injectNetworkPartition(ctx context.Context, containerID string, params map[string]string) (undoCmd string, err error) {
	targetIP := params["target_ip"]
	if targetIP == "" {
		return "", fmt.Errorf("param 'target_ip' is required for network_partition")
	}

	cmd := fmt.Sprintf("iptables -A INPUT -s %s -j DROP && iptables -A OUTPUT -d %s -j DROP", targetIP, targetIP)

	_, exitCode, err := e.docker.ExecCommand(ctx, containerID, []string{"sh", "-c", cmd})
	if err != nil {
		return "", fmt.Errorf("executing iptables partition: %w", err)
	}
	if exitCode != 0 {
		return "", fmt.Errorf("iptables partition command exited with code %d", exitCode)
	}

	undo := fmt.Sprintf("iptables -D INPUT -s %s -j DROP && iptables -D OUTPUT -d %s -j DROP", targetIP, targetIP)
	return undo, nil
}
