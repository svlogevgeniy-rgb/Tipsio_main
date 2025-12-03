#!/bin/bash

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     Tipsio Diagnostics                ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Определяем URL
if [ -f ".env" ]; then
    NEXTAUTH_URL=$(grep NEXTAUTH_URL .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$NEXTAUTH_URL" ]; then
    NEXTAUTH_URL="http://localhost:3000"
fi

# 1. Проверка окружения
echo -e "${BLUE}1. Environment Check${NC}"
echo "-------------------"
echo "Node version:    $(node --version)"
echo "npm version:     $(npm --version)"
echo "Git branch:      $(git branch --show-current)"
echo "Last commit:     $(git log -1 --pretty=format:'%h - %s (%cr)')"
echo ""

# 2. Проверка .env
echo -e "${BLUE}2. Environment Variables${NC}"
echo "------------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✓${NC} DATABASE_URL is set"
    else
        echo -e "${RED}✗${NC} DATABASE_URL is missing"
    fi
    
    if grep -q "NEXTAUTH_SECRET" .env; then
        echo -e "${GREEN}✓${NC} NEXTAUTH_SECRET is set"
    else
        echo -e "${RED}✗${NC} NEXTAUTH_SECRET is missing"
    fi
    
    if grep -q "NEXTAUTH_URL" .env; then
        echo -e "${GREEN}✓${NC} NEXTAUTH_URL is set: $NEXTAUTH_URL"
    else
        echo -e "${YELLOW}⚠${NC} NEXTAUTH_URL is not set"
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
fi
echo ""

# 3. Проверка Prisma
echo -e "${BLUE}3. Prisma Check${NC}"
echo "---------------"
if [ -d "node_modules/.prisma" ]; then
    echo -e "${GREEN}✓${NC} Prisma Client generated"
else
    echo -e "${RED}✗${NC} Prisma Client not generated"
    echo "  Run: npx prisma generate"
fi

if [ -f "prisma/schema.prisma" ]; then
    echo -e "${GREEN}✓${NC} Prisma schema exists"
else
    echo -e "${RED}✗${NC} Prisma schema not found"
fi
echo ""

# 4. Проверка сборки
echo -e "${BLUE}4. Build Check${NC}"
echo "--------------"
if [ -d ".next" ]; then
    echo -e "${GREEN}✓${NC} .next directory exists"
    BUILD_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" .next 2>/dev/null || stat -c "%y" .next 2>/dev/null | cut -d'.' -f1)
    echo "  Last build: $BUILD_TIME"
else
    echo -e "${RED}✗${NC} .next directory not found"
    echo "  Run: npm run build"
fi
echo ""

# 5. Проверка процесса
echo -e "${BLUE}5. Process Check${NC}"
echo "----------------"
if command -v pm2 &> /dev/null; then
    echo "PM2 detected:"
    pm2 list | grep tipsio || echo -e "${YELLOW}⚠${NC} tipsio process not found in PM2"
elif command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "Docker Compose detected:"
    docker-compose ps
elif systemctl is-active --quiet tipsio; then
    echo -e "${GREEN}✓${NC} systemd service is active"
    systemctl status tipsio --no-pager | head -n 5
else
    echo -e "${YELLOW}⚠${NC} Could not detect process manager"
fi
echo ""

# 6. Health Check
echo -e "${BLUE}6. Health Check${NC}"
echo "---------------"
HEALTH_URL="${NEXTAUTH_URL}/api/health"
echo "Checking: $HEALTH_URL"

if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} Health check passed (HTTP $HTTP_CODE)"
        
        if command -v jq &> /dev/null; then
            echo ""
            echo "$HEALTH_BODY" | jq .
        else
            echo "$HEALTH_BODY"
        fi
    else
        echo -e "${RED}✗${NC} Health check failed (HTTP $HTTP_CODE)"
        echo "$HEALTH_BODY"
    fi
else
    echo -e "${YELLOW}⚠${NC} curl not found"
fi
echo ""

# 7. Проверка портов
echo -e "${BLUE}7. Port Check${NC}"
echo "-------------"
if command -v lsof &> /dev/null; then
    PORT_3000=$(lsof -i :3000 -t 2>/dev/null)
    if [ -n "$PORT_3000" ]; then
        echo -e "${GREEN}✓${NC} Port 3000 is in use (PID: $PORT_3000)"
    else
        echo -e "${RED}✗${NC} Port 3000 is not in use"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":3000 "; then
        echo -e "${GREEN}✓${NC} Port 3000 is in use"
    else
        echo -e "${RED}✗${NC} Port 3000 is not in use"
    fi
else
    echo -e "${YELLOW}⚠${NC} Cannot check ports (lsof/netstat not found)"
fi
echo ""

# 8. Логи (последние строки)
echo -e "${BLUE}8. Recent Logs${NC}"
echo "--------------"
if command -v pm2 &> /dev/null; then
    echo "Last 10 lines from PM2:"
    pm2 logs tipsio --lines 10 --nostream 2>/dev/null || echo "No logs available"
elif command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "Last 10 lines from Docker:"
    docker-compose logs --tail 10 2>/dev/null || echo "No logs available"
elif systemctl is-active --quiet tipsio; then
    echo "Last 10 lines from systemd:"
    journalctl -u tipsio -n 10 --no-pager
else
    echo -e "${YELLOW}⚠${NC} Cannot access logs"
fi
echo ""

# Итоговая сводка
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     Diagnostics Complete               ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Рекомендации
echo -e "${BLUE}Recommendations:${NC}"
if [ ! -f ".env" ]; then
    echo "  • Create .env file with required variables"
fi
if [ ! -d "node_modules/.prisma" ]; then
    echo "  • Run: npx prisma generate"
fi
if [ ! -d ".next" ]; then
    echo "  • Run: npm run build"
fi
echo ""
