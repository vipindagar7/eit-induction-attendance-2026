#!/bin/bash
set -e

APP_NAME="eit-induction-attendance-2026"
APP_DIR="/var/www/eit-induction-attendance-2026"   # <-- change to your actual deploy path
REPO_URL="https://github.com/vipindagar7/eit-induction-attendance-2026.git"  # <-- fill in your repo
BRANCH="main"

echo "==> Deploying $APP_NAME"

if [ ! -d "$APP_DIR" ]; then
  echo "==> Directory not found, cloning fresh..."
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> Pulling latest changes from $BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
npm install

echo "==> Building"
npm run build

echo "==> Restarting via PM2"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 delete "$APP_NAME"
fi
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save

echo "==> Done. $APP_NAME is running on port 3002"
pm2 status "$APP_NAME"