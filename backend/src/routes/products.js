const express = require('express');
const router = express.Router();
const { db, redisClient } = require('../config');

// GET /api/products - Получить список всех продуктов
router.get('/', async (req, res) => {
    try {
        // Проверяем кэш
        const cachedData = await redisClient.get('products_list');
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // Запрос к БД
        const [rows] = await db.execute('SELECT * FROM products');
        
        // Сохраняем в кэш
        await redisClient.setEx('products_list', 3600, JSON.stringify(rows));
        
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Ошибка сервера при получении продуктов' });
    }
});

module.exports = router;