#!/bin/bash
# build-backend.sh - Setup the Python backend
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "🐍 Setting up Python Backend..."

cd "$BACKEND_DIR"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ Error: 'uv' is not installed. Please install it first: curl -LsS https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Sync dependencies
uv sync

echo "✅ Backend dependencies installed and venv prepared in $BACKEND_DIR/.venv"
