# Используем Node.js 18 на базе Alpine (лёгкий образ)
FROM node:18-alpine

# Создаём рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости (без dev-зависимостей для оптимизации)
RUN npm ci --only=production

# Копируем весь исходный код
COPY src/ ./src/
COPY .env ./

# Открываем порт, на котором работает Node.js
EXPOSE 3000

# Запускаем сервер
CMD ["node", "src/server.js"]