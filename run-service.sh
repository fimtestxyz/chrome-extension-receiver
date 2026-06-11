#!/bin/bash
# run-service.sh - Start the Python backend API
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "🚀 Starting Traffic Capture API..."

cd "$BACKEND_DIR"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ Error: 'uv' not found. Please install uv."
    exit 1
fi

# Run the application using uv run (handles venv automatically)
uv run python main.py
