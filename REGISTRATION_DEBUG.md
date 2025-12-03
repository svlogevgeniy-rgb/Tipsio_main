# 🔧 Инструкция по отладке регистрации на продакшн сервере

## ✅ Что было исправлено локально:

1. **Добавлено детальное логирование в API** (`src/app/api/auth/register/route.ts`)
   - Логи на каждом этапе регистрации
   - Детальная информация об ошибках
   - Стек трейс для отладки

2. **Улучшена обработка ошибок на фронтенде** (`src/app/venue/register/page.tsx`)
   - Логи в консоль браузера
   - Более детальные сообщения об ошибках
   - Валидация поля venueType

3. **Исправлена валидация формы**
   - Поле venueType теперь правильно валидируется
   - Добавлен флаг `shouldValidate: true`

## 🚀 Шаги для деплоя на продакшн:

### 1. Обновите код на сервере
```bash
cd /path/to/tipsio
git pull origin main
```

### 2. Установите зависимости (если нужно)
```bash
npm install
```

### 3. Сгенерируйте Prisma Client
```bash
npx prisma generate
```

### 4. Соберите проект
```bash
npm run build
```

### 5. Перезапустите приложение
```bash
# Если используете PM2:
pm2 restart tipsio

# Если используете Docker:
docker-compose restart

# Если используете systemd:
sudo systemctl restart tipsio
```

## 🔍 Как проверить, что работает:

### Проверка 1: Тест API напрямую
```bash
curl -X POST http://5.129.242.61/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "venueName": "Test Cafe",
    "venueType": "CAFE"
  }'
```

**Ожидаемый результат:**
```json
{
  "message": "Registration successful",
  "userId": "...",
  "venueId": "..."
}
```

### Проверка 2: Через браузер
1. Откройте http://5.129.242.61/venue/register
2. Откройте DevTools (F12)
3. Перейдите на вкладку "Console"
4. Заполните форму и нажмите "Create Account"
5. Посмотрите логи в Console:
   - `[Register] Submitting registration: ...`
   - `[Register] Response status: ...`
   - `[Register] Response data: ...`

### Проверка 3: Логи сервера
```bash
# PM2:
pm2 logs tipsio --lines 50

# Docker:
docker logs tipsio-container --tail 50

# Systemd:
journalctl -u tipsio -n 50
```

**Ищите строки:**
- `[Registration] Starting registration process`
- `[Registration] Request body received: ...`
- `[Registration] Registration successful`

## 🐛 Возможные проблемы и решения:

### Проблема 1: "DATABASE_URL is not set"
**Решение:**
```bash
# Проверьте .env файл на сервере
cat .env | grep DATABASE_URL

# Если пусто, добавьте:
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/tipsio"' >> .env
```

### Проблема 2: "Prisma Client not generated"
**Решение:**
```bash
npx prisma generate
npm run build
pm2 restart tipsio
```

### Проблема 3: "User with this email already exists"
**Решение:**
```bash
# Используйте другой email или удалите тестового пользователя:
npx prisma studio
# Найдите и удалите пользователя через UI
```

### Проблема 4: CORS ошибки
**Решение:**
Проверьте `next.config.mjs`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      ],
    },
  ]
}
```

## 📊 Мониторинг после деплоя:

### Проверьте метрики:
```bash
# Количество успешных регистраций:
echo "SELECT COUNT(*) FROM \"User\" WHERE role = 'MANAGER';" | npx prisma db execute --stdin

# Последние регистрации:
echo "SELECT email, \"createdAt\" FROM \"User\" WHERE role = 'MANAGER' ORDER BY \"createdAt\" DESC LIMIT 5;" | npx prisma db execute --stdin
```

## 🎯 Контрольный список:

- [ ] Код обновлён на сервере (`git pull`)
- [ ] Зависимости установлены (`npm install`)
- [ ] Prisma Client сгенерирован (`npx prisma generate`)
- [ ] Проект собран (`npm run build`)
- [ ] Приложение перезапущено (`pm2 restart`)
- [ ] API тест прошёл успешно (curl)
- [ ] Регистрация через браузер работает
- [ ] Логи показывают успешные регистрации

## 📞 Если проблема остаётся:

Соберите следующую информацию:
1. Скриншот ошибки из браузера (Console + Network tab)
2. Логи сервера (последние 50 строк)
3. Результат curl теста
4. Версия Node.js: `node --version`
5. Версия npm: `npm --version`

И отправьте мне для дальнейшей диагностики.
