#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'
BOLD='\033[1m'

INSTALL_DIR="$HOME/.distsim"
VERSION="0.1.0"

echo ""
echo -e "${GREEN}${BOLD}  DistSim${NC} v${VERSION}"
echo -e "${DIM}  Distributed Systems Simulator${NC}"
echo ""

# ──────────────────────────────────────
# Prerequisites
# ──────────────────────────────────────
echo -e "${DIM}Checking prerequisites...${NC}"

fail() { echo -e "  ${RED}✗${NC} $1"; echo -e "    $2"; exit 1; }
ok() { echo -e "  ${GREEN}✓${NC} $1"; }

command -v docker &>/dev/null || fail "Docker not found" "Install: curl -fsSL https://get.docker.com | sh"
docker info &>/dev/null || fail "Docker not running" "Start: sudo systemctl start docker"
ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)"

command -v go &>/dev/null || fail "Go not found" "Install: sudo dnf install golang  OR  https://go.dev/dl/"
ok "Go $(go version | grep -oP '\d+\.\d+\.\d+')"

command -v node &>/dev/null || fail "Node.js not found" "Install: sudo dnf install nodejs  OR  https://nodejs.org"
ok "Node $(node --version)"

if command -v pnpm &>/dev/null; then
  ok "pnpm $(pnpm --version)"
  PKG=pnpm
elif command -v npm &>/dev/null; then
  ok "npm $(npm --version)"
  PKG=npm
else
  fail "pnpm or npm not found" "Install: npm install -g pnpm"
fi

echo ""

# ──────────────────────────────────────
# Install
# ──────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${DIM}Updating existing installation...${NC}"
  cd "$INSTALL_DIR"
  git pull --quiet 2>/dev/null || true
else
  echo -e "${DIM}Installing to ${INSTALL_DIR}...${NC}"
  # Clone from GitHub. Replace with your actual repo URL.
  git clone --quiet --depth 1 https://github.com/hamidlabs/distsim.git "$INSTALL_DIR" 2>/dev/null || {
    # If no remote repo, copy current directory
    mkdir -p "$INSTALL_DIR"
    cp -r "$(dirname "$0")"/* "$INSTALL_DIR/" 2>/dev/null || true
    cp -r "$(dirname "$0")"/.* "$INSTALL_DIR/" 2>/dev/null || true
  }
  cd "$INSTALL_DIR"
fi

# ──────────────────────────────────────
# Build base Docker image
# ──────────────────────────────────────
echo -e "${DIM}Building base machine image...${NC}"
docker build -q -t distsim-base:latest ./containers/base > /dev/null 2>&1
ok "Base image built"

# ──────────────────────────────────────
# Build backend
# ──────────────────────────────────────
echo -e "${DIM}Building backend...${NC}"
cd backend
go mod tidy -v 2>/dev/null
go build -o bin/server ./cmd/server/ 2>&1
cd ..
ok "Backend built"

# ──────────────────────────────────────
# Build frontend
# ──────────────────────────────────────
echo -e "${DIM}Installing frontend dependencies...${NC}"
cd frontend
CI=true $PKG install 2>/dev/null || CI=true $PKG install
echo -e "${DIM}Building frontend...${NC}"
CI=true $PKG run build 2>/dev/null
cd ..
ok "Frontend built"

# ──────────────────────────────────────
# Create CLI
# ──────────────────────────────────────
mkdir -p "$INSTALL_DIR/bin"

cat > "$INSTALL_DIR/bin/distsim" << 'SCRIPT'
#!/bin/bash
DIR="$HOME/.distsim"
BACKEND_PID_FILE="$DIR/.backend.pid"
FRONTEND_PID_FILE="$DIR/.frontend.pid"
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

is_running() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

cmd_start() {
  echo ""
  echo -e "${GREEN}${BOLD}  DistSim${NC}"
  echo ""

  # Clean orphaned Docker resources
  docker ps -a --filter "label=managed-by=distsim" -q | xargs -r docker rm -f 2>/dev/null
  docker network ls --filter "name=distsim" -q | xargs -r docker network rm 2>/dev/null

  # Start backend
  if is_running "$BACKEND_PID_FILE"; then
    echo -e "  ${DIM}Backend already running (PID $(cat $BACKEND_PID_FILE))${NC}"
  else
    cd "$DIR/backend"
    nohup "$DIR/backend/bin/server" > "$DIR/.backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    sleep 1
    if is_running "$BACKEND_PID_FILE"; then
      echo -e "  ${GREEN}✓${NC} Backend started on :8080"
    else
      echo -e "  ${RED}✗${NC} Backend failed to start — check: distsim logs backend"
    fi
  fi

  # Start frontend (production mode)
  if is_running "$FRONTEND_PID_FILE"; then
    echo -e "  ${DIM}Frontend already running (PID $(cat $FRONTEND_PID_FILE))${NC}"
  else
    cd "$DIR/frontend"
    PORT=3000 nohup npx next start -p 3000 > "$DIR/.frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    sleep 2
    if is_running "$FRONTEND_PID_FILE"; then
      echo -e "  ${GREEN}✓${NC} Frontend started on :3000"
    else
      echo -e "  ${RED}✗${NC} Frontend failed to start — check: distsim logs frontend"
    fi
  fi

  sleep 1
  echo ""
  echo -e "  ${BOLD}Open:${NC} http://localhost:3000"
  echo -e "  ${DIM}API:  http://localhost:8080${NC}"
  echo ""
  echo -e "  ${DIM}Stop:   distsim stop${NC}"
  echo -e "  ${DIM}Status: distsim status${NC}"
  echo -e "  ${DIM}Logs:   distsim logs${NC}"
  echo ""
}

cmd_stop() {
  echo ""
  if is_running "$BACKEND_PID_FILE"; then
    kill "$(cat $BACKEND_PID_FILE)" 2>/dev/null
    rm -f "$BACKEND_PID_FILE"
    echo -e "  ${GREEN}✓${NC} Backend stopped"
  else
    echo -e "  ${DIM}Backend not running${NC}"
  fi

  if is_running "$FRONTEND_PID_FILE"; then
    kill "$(cat $FRONTEND_PID_FILE)" 2>/dev/null
    rm -f "$FRONTEND_PID_FILE"
    echo -e "  ${GREEN}✓${NC} Frontend stopped"
  else
    echo -e "  ${DIM}Frontend not running${NC}"
  fi

  # Clean Docker resources
  docker ps -a --filter "label=managed-by=distsim" -q | xargs -r docker rm -f 2>/dev/null
  docker network ls --filter "name=distsim" -q | xargs -r docker network rm 2>/dev/null
  echo -e "  ${GREEN}✓${NC} Docker resources cleaned"
  echo ""
}

cmd_status() {
  echo ""
  if is_running "$BACKEND_PID_FILE"; then
    echo -e "  ${GREEN}●${NC} Backend   running (PID $(cat $BACKEND_PID_FILE)) — :8080"
  else
    echo -e "  ${RED}●${NC} Backend   stopped"
  fi

  if is_running "$FRONTEND_PID_FILE"; then
    echo -e "  ${GREEN}●${NC} Frontend  running (PID $(cat $FRONTEND_PID_FILE)) — :3000"
  else
    echo -e "  ${RED}●${NC} Frontend  stopped"
  fi

  local containers=$(docker ps --filter "label=managed-by=distsim" -q | wc -l)
  local networks=$(docker network ls --filter "name=distsim" -q | wc -l)
  echo -e "  ${DIM}Docker:   ${containers} containers, ${networks} networks${NC}"
  echo ""
}

cmd_logs() {
  local target="${1:-all}"
  if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
    echo -e "${DIM}=== Backend ===${NC}"
    tail -20 "$DIR/.backend.log" 2>/dev/null || echo "  No logs"
  fi
  if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
    echo -e "${DIM}=== Frontend ===${NC}"
    tail -20 "$DIR/.frontend.log" 2>/dev/null || echo "  No logs"
  fi
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_dev() {
  echo ""
  echo -e "${GREEN}${BOLD}  DistSim${NC} ${DIM}(dev mode)${NC}"
  echo ""
  echo -e "  ${DIM}Starting in development mode with hot reload...${NC}"
  echo ""

  # Clean orphaned Docker resources
  docker ps -a --filter "label=managed-by=distsim" -q | xargs -r docker rm -f 2>/dev/null
  docker network ls --filter "name=distsim" -q | xargs -r docker network rm 2>/dev/null

  # Start backend
  cd "$DIR/backend"
  go run ./cmd/server/ &
  BACKEND_PID=$!
  echo $BACKEND_PID > "$BACKEND_PID_FILE"
  echo -e "  ${GREEN}✓${NC} Backend (dev) on :8080"

  # Start frontend
  cd "$DIR/frontend"
  if command -v pnpm &>/dev/null; then
    pnpm dev &
  else
    npm run dev &
  fi
  FRONTEND_PID=$!
  echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
  echo -e "  ${GREEN}✓${NC} Frontend (dev) on :3000"

  echo ""
  echo -e "  ${BOLD}Open:${NC} http://localhost:3000"
  echo -e "  ${DIM}Press Ctrl+C to stop${NC}"
  echo ""

  # Wait and cleanup on exit
  trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f $BACKEND_PID_FILE $FRONTEND_PID_FILE; echo ''; echo -e '  ${GREEN}✓${NC} Stopped'; echo ''" EXIT
  wait
}

cmd_clean() {
  cmd_stop
  echo -e "  ${DIM}Removing all distsim Docker images...${NC}"
  docker rmi distsim-base:latest 2>/dev/null || true
  echo -e "  ${GREEN}✓${NC} Clean"
  echo ""
}

cmd_uninstall() {
  cmd_stop
  echo -e "  ${DIM}Removing $DIR...${NC}"
  rm -rf "$DIR"
  echo -e "  ${GREEN}✓${NC} Uninstalled"
  echo -e "  ${DIM}Remove from PATH: delete the distsim line from your shell config${NC}"
  echo ""
}

cmd_help() {
  echo ""
  echo -e "${GREEN}${BOLD}  DistSim${NC} — Distributed Systems Simulator"
  echo ""
  echo "  Usage: distsim <command>"
  echo ""
  echo "  Commands:"
  echo "    start       Start backend + frontend (production build)"
  echo "    stop        Stop everything + clean Docker resources"
  echo "    restart     Stop then start"
  echo "    status      Show what's running"
  echo "    dev         Start in dev mode (hot reload)"
  echo "    logs        Show recent logs (backend/frontend/all)"
  echo "    clean       Stop + remove Docker images"
  echo "    uninstall   Remove DistSim completely"
  echo ""
}

case "${1:-help}" in
  start)     cmd_start ;;
  stop)      cmd_stop ;;
  restart)   cmd_restart ;;
  status)    cmd_status ;;
  dev)       cmd_dev ;;
  logs)      cmd_logs "${2:-all}" ;;
  clean)     cmd_clean ;;
  uninstall) cmd_uninstall ;;
  *)         cmd_help ;;
esac
SCRIPT

chmod +x "$INSTALL_DIR/bin/distsim"

# ──────────────────────────────────────
# Add to PATH
# ──────────────────────────────────────
add_to_path() {
  local line='export PATH="$HOME/.distsim/bin:$PATH"'
  if [ -f "$1" ] && ! grep -q "distsim/bin" "$1" 2>/dev/null; then
    echo "$line" >> "$1"
  fi
}

add_to_path "$HOME/.bashrc"
add_to_path "$HOME/.zshrc"
add_to_path "$HOME/.profile"

# Fish shell
if [ -d "$HOME/.config/fish" ]; then
  fish -c "fish_add_path $INSTALL_DIR/bin" 2>/dev/null || true
fi

export PATH="$INSTALL_DIR/bin:$PATH"

# ──────────────────────────────────────
# Done
# ──────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  Installed successfully!${NC}"
echo ""
echo "  Quick start:"
echo ""
echo -e "    ${BOLD}distsim start${NC}     Start the platform"
echo -e "    ${BOLD}distsim dev${NC}       Start in dev mode (hot reload)"
echo ""
echo -e "    Then open: ${BOLD}http://localhost:3000${NC}"
echo ""
echo -e "  ${DIM}Restart your terminal or run:${NC}"
echo -e "  ${DIM}export PATH=\"\$HOME/.distsim/bin:\$PATH\"${NC}"
echo ""
