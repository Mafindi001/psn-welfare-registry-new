#!/bin/bash

# PSN Welfare Registry Production Deployment Script
set -e

echo "🚀 Starting production deployment..."
echo "======================================"

# Variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/deploy_$TIMESTAMP"
APP_DIR="/var/www/psn-welfare-backend"
FRONTEND_DIR="/var/www/psn-welfare-frontend"
LOG_DIR="/var/log/psn-welfare"

# Load environment
source ~/.bashrc
export NODE_ENV=production

echo "📦 Step 1: Creating backups..."
mkdir -p $BACKUP_DIR

# Backup database
echo "  Creating database backup..."
docker exec psn_welfare_db pg_dump -U psn_admin psn_welfare > "$BACKUP_DIR/db_backup.sql"

# Backup application files
echo "  Backing up application files..."
tar -czf "$BACKUP_DIR/app_backup.tar.gz" $APP_DIR 2>/dev/null || true

echo "✅ Backups created in $BACKUP_DIR"

echo "📦 Step 2: Pulling latest code..."
cd $APP_DIR
git fetch origin
git checkout main
git pull origin main

echo "📦 Step 3: Installing dependencies..."
npm ci --only=production

echo "📦 Step 4: Building database..."
npx prisma generate
npx prisma migrate deploy

echo "📦 Step 5: Building frontend..."
cd $FRONTEND_DIR
git pull origin main
npm ci
npm run build

echo "📦 Step 6: Restarting services..."
cd $APP_DIR
pm2 restart ecosystem.config.js --env production

echo "📦 Step 7: Running health checks..."
sleep 10

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://api.psntaraba.org.ng/health)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed with status: $HEALTH_CHECK"
    exit 1
fi

echo "📦 Step 8: Cleaning up..."
# Keep only last 5 backups
find /backups -type d -name "deploy_*" | sort -r | tail -n +6 | xargs rm -rf

echo "======================================"
echo "🎉 Deployment completed successfully!"
echo ""
echo "Deployment Summary:"
echo "  - Timestamp: $TIMESTAMP"
echo "  - Frontend: https://welfare.psntaraba.org.ng"
echo "  - Backend API: https://api.psntaraba.org.ng"
echo "  - Health Check: https://api.psntaraba.org.ng/health"
echo "  - Backups: $BACKUP_DIR"
echo ""
echo "Monitor logs: pm2 logs psn-welfare-backend"
echo "======================================"