#!/bin/bash

# Exit on error
set -e

echo "🚀 Building Doctor Appointment Frontend for Production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Build for production
echo "🏗️ Building production bundle..."
npm run build

# Show success message
echo "✅ Production build complete!"
echo "📁 Output files are in dist/ directory" 