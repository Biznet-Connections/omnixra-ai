#!/bin/bash
set -e

echo "Building frontend..."
cd frontend
npm install
npm run build

echo "Installing server dependencies..."
cd ../server
npm install

echo "Build complete!"
