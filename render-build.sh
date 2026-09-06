#!/bin/bash
set -e

echo "Installing FFmpeg..."
apt-get update -y
apt-get install -y ffmpeg

echo "Building frontend..."
cd frontend
npm install
npm run build

echo "Installing server dependencies..."
cd ../server
npm install

echo "Build complete!"
