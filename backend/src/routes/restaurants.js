const express = require('express');
const router = express.Router();
const { db, redisClient } = require('../config');

// GET /api/restaurants - Получить список всех ресторанов
router.get('/', async (req, res) => {
    try {
        // 1. Проверяем кэш Redis
        const cachedData = await redisClient.get('restaurants_list');
        if (cachedData) {
            console.log('Данные ресторанов получены из кэша Redis');
            return res.json(JSON.parse(cachedData));
        }

        // 2. Если в кэше нет, запрашиваем из MySQL
        const [rows] = await db.execute('SELECT * FROM restaurants');
        
        // 3. Сохраняем в кэш на 1 час (3600 секунд)
        await redisClient.setEx('restaurants_list', 3600, JSON.stringify(rows));
        
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Ошибка сервера при получении ресторанов' });
    }
});

module.exports = router;