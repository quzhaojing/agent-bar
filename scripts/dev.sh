#!/bin/bash

# Agent Bar Development Script

echo "🚀 Starting Agent Bar Development..."

# Check if Plasmo is installed
if ! command -v plasmo &> /dev/null; then
    echo "📦 Installing Plasmo CLI..."
    npm install -g plasmo
fi

# Install dependencies
echo "📚 Installing dependencies..."
npm install --no-optional

# Start development server
echo "🔧 Starting development server..."
npm run dev