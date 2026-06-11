#!/bin/bash
# build-extension.sh - Prepare the Chrome Extension
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$PROJECT_ROOT"

echo "📦 Building Chrome Extension..."

# In this project, the extension is "unpacked" (no build step needed as we use vanilla JS)
# But we can ensure the directory structure is clean and icons are present
if [ ! -d "$EXT_DIR/icons" ]; then
    echo "❌ Error: icons directory missing. Please run the icon generator script if needed."
    exit 1
fi

echo "✅ Extension is ready in: $EXT_DIR"
echo "👉 Load it in Chrome via: chrome://extensions/ -> Load unpacked"
