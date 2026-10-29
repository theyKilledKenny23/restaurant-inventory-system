const express = require('express');
const router = express.Router();
const { db, redisClient } = require('../config');

// GET /api/invoices - Получить список всех накладных
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT inv.id, r.name as restaurant_name, inv.invoice_type, inv.invoice_date, inv.created_at
            FROM invoices inv
            JOIN restaurants r ON inv.restaurant_id = r.id
            ORDER BY inv.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Ошибка при получении накладных' });
    }
});

// POST /api/invoices - Создать накладную и АВТОМАТИЧЕСКИ обновить остатки
router.post('/', async (req, res) => {
    // Получаем соединение из пула для транзакции
    const connection = await db.getConnection();
    try {
        const { restaurant_id, invoice_type, invoice_date, items } = req.body;
        // items - это массив объектов: [{ product_id, quantity, expiry_date }]

        // 1. Начинаем транзакцию
        await connection.beginTransaction();

        // 2. Создаем саму накладную
        const [invoiceResult] = await connection.execute(
            'INSERT INTO invoices (restaurant_id, invoice_type, invoice_date) VALUES (?, ?, ?)',
            [restaurant_id, invoice_type, invoice_date]
        );
        const invoiceId = invoiceResult.insertId;

        // 3. Проходим по всем позициям накладной
        for (const item of items) {
            // Добавляем позицию в таблицу invoice_items
            await connection.execute(
                'INSERT INTO invoice_items (invoice_id, product_id, quantity, expiry_date) VALUES (?, ?, ?, ?)',
                [invoiceId, item.product_id, item.quantity, item.expiry_date || null]
            );

            // 4. Обновляем остатки на складе (inventory)
            if (invoice_type === 'incoming') {
                // ПРИХОД: увеличиваем количество. 
                // ON DUPLICATE KEY UPDATE - если продукт уже есть, обновляем его, если нет - создаем.
                await connection.execute(`
                    INSERT INTO inventory (restaurant_id, product_id, quantity, expiry_date)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    quantity = quantity + VALUES(quantity),
                    expiry_date = VALUES(expiry_date)
                `, [restaurant_id, item.product_id, item.quantity, item.expiry_date]);
            } else if (invoice_type === 'outgoing') {
                // РАСХОД: уменьшаем количество
                await connection.execute(`
                    UPDATE inventory
                    SET quantity = quantity - ?
                    WHERE restaurant_id = ? AND product_id = ?
                `, [item.quantity, restaurant_id, item.product_id]);
            }

            // 5. ОЧИЩАЕМ КЭШ REDIS для этого ресторана, чтобы фронтенд сразу увидел новые цифры!
            await redisClient.del(`inventory_${restaurant_id}`);
        }

        // 6. Подтверждаем транзакцию (сохраняем все изменения)
        await connection.commit();
        res.status(201).json({ message: 'Накладная успешно создана и склад обновлен', invoiceId });

    } catch (error) {
        // Если что-то пошло не так, откатываем все изменения назад
        await connection.rollback();
        console.error(error.message);
        res.status(500).json({ error: 'Ошибка при создании накладной' });
    } finally {
        // Возвращаем соединение обратно в пул
        connection.release();
    }
});

module.exports = router;