#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода с цветом
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Заголовок
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     Tipsio Deployment Script         ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Проверка, что мы в правильной директории
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project directory?"
    exit 1
fi

print_success "Found package.json"

# Шаг 1: Git pull
print_step "Step 1/7: Pulling latest code from git..."
if git pull origin main; then
    print_success "Code updated successfully"
else
    print_error "Failed to pull code"
    exit 1
fi

# Шаг 2: Установка зависимостей (если нужно)
print_step "Step 2/7: Checking dependencies..."
if [ -f "package-lock.json" ]; then
    if npm ci --production=false; then
        print_success "Dependencies installed"
    else
        print_warning "npm ci failed, trying npm install..."
        if npm install; then
            print_success "Dependencies installed with npm install"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    fi
else
    print_warning "package-lock.json not found, using npm install"
    if npm install; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

# Шаг 3: Генерация Prisma Client
print_step "Step 3/7: Generating Prisma Client..."
if npx prisma generate; then
    print_success "Prisma Client generated"
else
    print_error "Failed to generate Prisma Client"
    exit 1
fi

# Шаг 4: Применение миграций (опционально)
print_step "Step 4/7: Checking database migrations..."
read -p "Do you want to apply database migrations? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npx prisma migrate deploy; then
        print_success "Migrations applied"
    else
        print_error "Failed to apply migrations"
        exit 1
    fi
else
    print_warning "Skipped migrations"
fi

# Шаг 5: Сборка проекта
print_step "Step 5/7: Building project..."
if npm run build; then
    print_success "Project built successfully"
else
    print_error "Failed to build project"
    exit 1
fi

# Шаг 6: Перезапуск приложения
print_step "Step 6/7: Restarting application..."

# Определяем, какой процесс-менеджер используется
if command -v pm2 &> /dev/null; then
    print_step "Detected PM2, restarting..."
    if pm2 restart tipsio; then
        print_success "Application restarted with PM2"
    else
        print_error "Failed to restart with PM2"
        exit 1
    fi
elif command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    print_step "Detected Docker Compose, restarting..."
    if docker-compose restart; then
        print_success "Application restarted with Docker Compose"
    else
        print_error "Failed to restart with Docker Compose"
        exit 1
    fi
elif systemctl is-active --quiet tipsio; then
    print_step "Detected systemd service, restarting..."
    if sudo systemctl restart tipsio; then
        print_success "Application restarted with systemd"
    else
        print_error "Failed to restart with systemd"
        exit 1
    fi
else
    print_warning "Could not detect process manager. Please restart manually."
fi

# Шаг 7: Проверка здоровья
print_step "Step 7/7: Checking application health..."
sleep 3  # Даём время приложению запуститься

# Определяем URL для проверки
if [ -f ".env" ]; then
    NEXTAUTH_URL=$(grep NEXTAUTH_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$NEXTAUTH_URL" ]; then
    NEXTAUTH_URL="http://localhost:3000"
fi

HEALTH_URL="${NEXTAUTH_URL}/api/health"

print_step "Checking health at: $HEALTH_URL"

if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Health check passed (HTTP $HTTP_CODE)"
        
        # Проверяем детали, если установлен jq
        if command -v jq &> /dev/null; then
            echo ""
            echo -e "${BLUE}Health Check Details:${NC}"
            echo "$HEALTH_BODY" | jq .
        fi
    else
        print_error "Health check failed (HTTP $HTTP_CODE)"
        echo "$HEALTH_BODY"
        exit 1
    fi
else
    print_warning "curl not found, skipping health check"
fi

# Финальное сообщение
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}     Deployment Completed! 🎉          ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Показываем полезные команды
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:        pm2 logs tipsio"
echo "  Check status:     pm2 status"
echo "  Health check:     curl $HEALTH_URL"
echo "  Test registration: curl -X POST ${NEXTAUTH_URL}/api/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"test123456\",\"venueName\":\"Test\",\"venueType\":\"CAFE\"}'"
echo ""

exit 0
