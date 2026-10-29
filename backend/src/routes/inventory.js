const express = require('express');
const router = express.Router();
const { db, redisClient } = require('../config');

// ВАЖНО: этот маршрут должен идти ПЕРЕД /:restaurant_id, 
// иначе Express подумает, что "expiring-items" — это ID ресторана.

// GET /api/inventory/expiring-items - Продукты с истекающим сроком годности (ближайшие 7 дней)
router.get('/expiring-items', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.name as restaurant_name, p.name as product_name, i.quantity, i.expiry_date
            FROM inventory i
            JOIN restaurants r ON i.restaurant_id = r.id
            JOIN products p ON i.product_id = p.id
            WHERE i.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            ORDER BY i.expiry_date ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Ошибка при получении истекающих продуктов' });
    }
});

// GET /api/inventory/:restaurant_id - Получить остатки по конкретному ресторану
router.get('/:restaurant_id', async (req, res) => {
    try {
        const { restaurant_id } = req.params;
        const cacheKey = `inventory_${restaurant_id}`;

        // 1. Проверяем кэш Redis
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`Остатки для ресторана ${restaurant_id} получены из кэша`);
            return res.json(JSON.parse(cachedData));
        }

        // 2. Запрос к БД с JOIN (добавлено условие quantity > 0)
        const [rows] = await db.execute(`
            SELECT i.id, p.name as product_name, p.unit, p.category, i.quantity, i.expiry_date
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.restaurant_id = ? AND i.quantity > 0
        `, [restaurant_id]);

        // 3. Сохраняем в кэш на 10 минут (600 секунд)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(rows));
        
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Ошибка при получении остатков' });
    }
});

module.exports = router;