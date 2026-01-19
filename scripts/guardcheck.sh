#!/bin/bash
set -e

echo "🚀 Starting Guardrail Checks..."

echo "--- 1. Type Check ---"
npm run typecheck

echo "--- 2. Unit Tests ---"
npm run test -- --watch=false

echo "--- 3. Build & Checklist Generation ---"
npm run checklist

echo "✅ All checks passed! Repository is healthy."
