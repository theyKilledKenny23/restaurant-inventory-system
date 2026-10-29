require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { redisClient } = require('./config');

// Импорт маршрутов
const restaurantsRoutes = require('./routes/restaurants');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const invoicesRoutes = require('./routes/invoices');

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json());

// Явно указываем кодировку для всех ответов
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
}); 

// Подключаем маршруты
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoicesRoutes);

// Тестовый маршрут
app.get('/', (req, res) => {
    res.json({ message: 'Restaurant Inventory API is running!' });
});

// Функция запуска сервера
async function startServer() {
    try {
        await redisClient.connect();
        console.log('✅ Успешное подключение к Redis');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
        });

    } catch (error) {
        console.error('❌ Ошибка при запуске сервера:', error.message);
        process.exit(1);
    }
}

startServer();