#!/bin/bash

# Быстрый деплой без интерактивных вопросов
set -e  # Остановиться при ошибке

echo "🚀 Quick Deploy Starting..."

# 1. Pull code
echo "📥 Pulling code..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false || npm install

# 3. Generate Prisma
echo "🔧 Generating Prisma Client..."
npx prisma generate

# 4. Build
echo "🏗️  Building project..."
npm run build

# 5. Restart
echo "♻️  Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart tipsio
elif command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    docker-compose restart
elif systemctl is-active --quiet tipsio; then
    sudo systemctl restart tipsio
else
    echo "⚠️  Please restart manually"
fi

# 6. Health check
echo "🏥 Checking health..."
sleep 3
curl -s http://localhost:3000/api/health | jq . || echo "Health check endpoint not responding"

echo "✅ Deployment complete!"
