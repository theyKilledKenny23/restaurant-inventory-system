const mysql = require('mysql2/promise');
const { createClient } = require('redis');

// Настройка пула соединений MySQL
const db = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'secret',
    database: process.env.MYSQL_DATABASE || 'restaurant_inventory',
    charset: 'utf8mb4',  // ← ВАЖНО: явно указываем кодировку
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Настройка клиента Redis
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', err => console.error('Redis Client Error', err));

module.exports = { db, redisClient };