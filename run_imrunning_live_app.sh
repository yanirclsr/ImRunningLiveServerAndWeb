#!/usr/bin/env bash
# run_imrunning_live_app.sh — run MongoDB (via Homebrew if needed), start the server in this folder,
# then build & launch the iOS app. Designed to live inside imrunningLive_server/.

set -euo pipefail

### --- PATHS (relative to this script) --- ###
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${SCRIPT_DIR}"                                   # this repo (server + API + webapp)
IOS_DIR="$(cd "${SCRIPT_DIR}/../imrunningLive_ios" && pwd)"  # sibling iOS repo

### --- CONFIG --- ###
SERVER_PORT=3000

IOS_SCHEME="Im Running App"      # Xcode scheme name
IOS_DEVICE="iPhone 16 Pro"       # Simulator device name (check with: xcrun simctl list devices)
IOS_CONFIGURATION="Debug"

### --- LOGGING & CLEANUP --- ###
log()  { printf "\033[1;34m[imrunning]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[imrunning]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[imrunning]\033[0m %s\n" "$*" >&2; }

cleanup() {
  log "Stopping background processes..."
  if [[ -n "$SERVER_PID" ]]; then
    log "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  pkill -P $$ || true
}
trap cleanup EXIT INT TERM

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

### --- REQUIREMENTS --- ###
require xcrun
require xcodebuild
require lsof

if ! command -v brew >/dev/null 2>&1; then
  warn "Homebrew not found; will not auto-start MongoDB."
fi

### --- PORT CLEANUP --- ###
kill_port_3000() {
  log "Cleaning up port 3000..."
  
  # Find and kill processes using port 3000
  local pids
  pids=$(lsof -ti:3000 2>/dev/null || true)
  
  if [[ -n "$pids" ]]; then
    log "Found processes using port 3000: $pids"
    for pid in $pids; do
      log "Killing process $pid..."
      kill -9 "$pid" 2>/dev/null || true
    done
    
    # Wait a moment for processes to fully terminate
    sleep 2
    
    # Double-check port is free
    if lsof -i:3000 >/dev/null 2>&1; then
      warn "Port 3000 still in use after cleanup attempt"
    else
      log "Port 3000 is now free"
    fi
  else
    log "Port 3000 is already free"
  fi
}

### --- MONGODB --- ###
start_mongo_if_needed() {
  if pgrep -x "mongod" >/dev/null; then
    log "MongoDB already running."
    return
  fi

  if ! command -v brew >/dev/null 2>&1; then
    err "MongoDB not running and Homebrew missing — start MongoDB manually."
    exit 1
  fi

  # Try common service names; pick the first that exists
  local svc=""
  for candidate in mongodb-community mongodb/brew/mongodb-community; do
    if brew services list | awk '{print $1}' | grep -qx "$candidate"; then
      svc="$candidate"; break
    fi
  done

  if [[ -z "$svc" ]]; then
    warn "Could not find a MongoDB Homebrew service entry. Trying: brew services start mongodb-community"
    svc="mongodb-community"
  fi

  log "Starting MongoDB via Homebrew: $svc"
  brew services start "$svc" || {
    err "Failed to start MongoDB service: $svc"
    exit 1
  }

  # Wait until mongod appears
  for _ in $(seq 1 30); do
    if pgrep -x "mongod" >/dev/null; then
      log "MongoDB started."
      return
    fi
    sleep 1
  done
  err "Timeout waiting for MongoDB to start."
  exit 1
}

### --- SERVER --- ###
start_server() {
  log "Starting server in: $SERVER_DIR"
  cd "$SERVER_DIR"
  if [[ -f package.json ]]; then
    npm install --no-audit --no-fund
  fi
  
  # Start server directly using Node.js to avoid port conflicts
  if [[ -f server.js ]]; then
    log "Starting server process..."
    # Start server in background and capture PID for cleanup
    node -e "require('./server.js').startServer()" &
    SERVER_PID=$!
    log "Server started with PID: $SERVER_PID"
  else
    err "No server.js found in $SERVER_DIR"
    exit 1
  fi
}

wait_for_server() {
  log "Waiting for server on port $SERVER_PORT..."
  for _ in $(seq 1 60); do
    if lsof -i :$SERVER_PORT >/dev/null 2>&1; then
      log "Server is listening on port $SERVER_PORT."
      return
    fi
    sleep 1
  done
  err "Timeout waiting for server on port $SERVER_PORT."
  exit 1
}

### --- iOS (Simulator) --- ###
clean_simulator() {
  log "Cleaning simulator environment..."
  
  # Shutdown simulator if running
  if xcrun simctl list devices | grep "$IOS_DEVICE (" | grep -q "Booted"; then
    log "Shutting down simulator $IOS_DEVICE..."
    xcrun simctl shutdown "$IOS_DEVICE" || true
    sleep 2
  fi
  
  # Clean simulator data (optional - uncomment if you want to reset simulator completely)
  # log "Resetting simulator data..."
  # xcrun simctl erase "$IOS_DEVICE" || true
}

boot_simulator() {
  log "Booting Simulator: $IOS_DEVICE"
  
  # Check current status
  local status
  status=$(xcrun simctl list devices | grep "$IOS_DEVICE (" | grep -v unavailable | head -n1 | sed -E 's/.*\(([^)]+)\).*/\1/')
  
  if [[ "$status" == "Booted" ]]; then
    log "Simulator $IOS_DEVICE is already booted"
  else
    log "Booting simulator $IOS_DEVICE..."
    xcrun simctl boot "$IOS_DEVICE" || {
      err "Failed to boot simulator $IOS_DEVICE"
      return 1
    }
    
    # Wait for boot to complete
    log "Waiting for simulator to finish booting..."
    for i in {1..30}; do
      if xcrun simctl list devices | grep "$IOS_DEVICE (" | grep -q "Booted"; then
        log "Simulator $IOS_DEVICE is now booted"
        break
      fi
      sleep 1
    done
  fi
  
  # Open Simulator app
  log "Opening Simulator app..."
  open -a Simulator
}

build_and_run_ios() {
  log "Building iOS app ($IOS_SCHEME) for $IOS_DEVICE"
  cd "$IOS_DIR"

  local workspace project dest
  workspace="$(ls -1 *.xcworkspace 2>/dev/null | head -n1 || true)"
  project="$(ls -1 *.xcodeproj 2>/dev/null | head -n1 || true)"
  dest="platform=iOS Simulator,name=$IOS_DEVICE"

  # Clean previous builds
  log "Cleaning previous build artifacts..."
  
  # Clean Xcode build
  if [[ -n "$workspace" ]]; then
    xcodebuild -workspace "$workspace" -scheme "$IOS_SCHEME" -configuration "$IOS_CONFIGURATION" -destination "$dest" clean
    log "Building fresh from workspace: $workspace"
    xcodebuild -workspace "$workspace" -scheme "$IOS_SCHEME" -configuration "$IOS_CONFIGURATION" -destination "$dest" build
  elif [[ -n "$project" ]]; then
    xcodebuild -project "$project" -scheme "$IOS_SCHEME" -configuration "$IOS_CONFIGURATION" -destination "$dest" clean
    log "Building fresh from project: $project"
    xcodebuild -project "$project" -scheme "$IOS_SCHEME" -configuration "$IOS_CONFIGURATION" -destination "$dest" build
  else
    err "No .xcworkspace or .xcodeproj found in $IOS_DIR"
    exit 1
  fi
  
  # Clean build directories for extra freshness
  log "Cleaning build directories..."
  rm -rf build/ DerivedData/ || true

  # Find .app & bundle id
  local derived="$IOS_DIR/build/Build/Products/${IOS_CONFIGURATION}-iphonesimulator"
  mkdir -p "$derived" || true
  # xcodebuild above already outputs into DerivedData by default; try to locate the .app anyway:
  local app_path
  app_path="$(find "$IOS_DIR" -path "*/Build/Products/${IOS_CONFIGURATION}-iphonesimulator/*.app" -maxdepth 6 -print -quit 2>/dev/null || true)"
  if [[ -z "$app_path" ]]; then
    # Fallback search
    app_path="$(find "$IOS_DIR" -name "*.app" -maxdepth 8 -print -quit 2>/dev/null || true)"
  fi
  if [[ -z "$app_path" ]]; then
    err "Could not locate the built .app. Check the build output."
    exit 1
  fi

  local udid
  udid="$(xcrun simctl list devices | grep "$IOS_DEVICE (" | grep -v unavailable | head -n1 | sed -E 's/.*\(([-0-9A-F]+)\).*/\1/')"
  if [[ -z "$udid" ]]; then
    err "Could not resolve UDID for simulator: $IOS_DEVICE"
    exit 1
  fi

  log "Installing app on Simulator ($udid)"
  # Try to read bundle id from Info.plist
  local bundle_id
  bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Info.plist" 2>/dev/null || true)"
  if [[ -z "$bundle_id" ]]; then
    bundle_id="$(defaults read "$app_path/Info" CFBundleIdentifier 2>/dev/null || true)"
  fi

  # Always uninstall existing app first for clean install
  if [[ -n "$bundle_id" ]]; then
    log "Uninstalling existing app: $bundle_id"
    xcrun simctl uninstall "$udid" "$bundle_id" || true
    sleep 1
  fi

  log "Installing fresh app..."
  xcrun simctl install "$udid" "$app_path" || {
    err "Failed to install app on simulator"
    return 1
  }

  if [[ -n "$bundle_id" ]]; then
    log "Launching $bundle_id"
    xcrun simctl launch "$udid" "$bundle_id" || warn "Launch failed — you can open it manually in the Simulator."
  else
    warn "Bundle identifier not found; open the app manually in the Simulator."
  fi
}

### --- MAIN --- ###
# Clean up port 3000 first to ensure clean start
kill_port_3000

start_mongo_if_needed
start_server
wait_for_server
clean_simulator
boot_simulator
build_and_run_ios

log "✅ MongoDB, server, and iOS app are running."
log "Server: http://localhost:${SERVER_PORT}"