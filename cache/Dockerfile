# Официальный образ Redis на базе Alpine
FROM redis:alpine

# Копируем кастомный конфиг Redis (опционально, для надёжности)
COPY redis.conf /usr/local/etc/redis/redis.conf

# Открываем стандартный порт Redis
EXPOSE 6379

# Запускаем Redis с нашим конфигом
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]