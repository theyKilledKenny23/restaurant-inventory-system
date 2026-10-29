# Официальный образ MySQL 8.0
FROM mysql:8.0

# Переменные окружения по умолчанию (можно переопределить в docker-compose)
ENV MYSQL_ROOT_PASSWORD=secret
ENV MYSQL_DATABASE=restaurant_inventory

# Копируем SQL-скрипты в специальную директорию MySQL
# MySQL автоматически выполнит все .sql файлы из /docker-entrypoint-initdb.d/ при первом запуске
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql
COPY seed.sql /docker-entrypoint-initdb.d/02-seed.sql

# Открываем стандартный порт MySQL
EXPOSE 3306