#!/bin/bash

# Add common paths for Homebrew/Python
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: 'python3' is not installed or not in your PATH."
    echo "Please install Python 3."
    read -p "Press [Enter] key to exit..."
    exit 1
fi

# Try to look for npm in common locations if not found
if ! command -v npm &> /dev/null; then
    # Try sourcing nvm if available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

if ! command -v npm &> /dev/null; then
    echo "Warning: 'npm' not found. Skipping build step."
    echo "Please ensure npm is in your PATH or install Node.js."
else
    echo "npm found at: $(command -v npm)"
fi

# Navigate to the script's directory
cd "$(dirname "$0")" || {
    echo "Error: Failed to change directory."
    read -p "Press [Enter] key to exit..."
    exit 1
}

echo "Starting ta-q Checklist local server..."
echo "Press Ctrl+C to stop."

# Build latest checklist
echo "Rebuilding checklist..."
if command -v npm &> /dev/null; then
    npm run checklist || echo "Build failed, but attempting to serve existing files."
else
    echo "Skipping build (npm not found)."
fi

# Change to docs directory
if [ -d "docs" ]; then
    cd docs
else
    echo "Error: docs directory not found."
    read -p "Press [Enter] key to exit..."
    exit 1
fi

# Run the server script
echo "Server is starting at http://localhost:7000"
echo "---------------------------------------------------"
# Open browser (macOS specific)
open http://localhost:7000

python3 -m http.server 7000

# Keep window open if server crashes or exits
echo ""
echo "Server process ended."
read -p "Press [Enter] key to exit..."
