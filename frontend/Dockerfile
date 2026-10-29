# Используем облегчённый образ Nginx на базе Alpine Linux
FROM nginx:alpine

# Копируем HTML, CSS, JS файлы в стандартную директорию Nginx
COPY public_html/ /usr/share/nginx/html/

# Копируем наш кастомный конфиг Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Открываем порт 80 (стандартный для HTTP)
EXPOSE 80

# Запускаем Nginx в фоновом режиме (foreground mode)
CMD ["nginx", "-g", "daemon off;"]