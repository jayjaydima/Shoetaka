// 1. Load environment variables and import packages
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./serviceAccountKey.json');

// 2. Initialize Firebase Admin (modular API)
const firebaseApp = initializeApp({
    credential: cert(serviceAccount)
});
const auth = getAuth(firebaseApp);

// 3. Create the server
const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// 4. Connect to MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shoe_inventory_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check database connection
db.getConnection()
    .then(connection => {
        console.log('Database Connected');
        connection.release();
    })
    .catch(error => {
        console.log('Database Error:', error.message);
    });

// 5. GET - Get all products
app.get('/api/product', async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products');

        const result = products.map(item => ({
            id: item.product_id,
            product: item.product_name,
            sell: String(item.sell_price || 0),
            stock: String(item.stock || 0),
            image: item.image || '',
            sellerId: item.seller_id,
            brand: item.brand || '',
            code: item.brand_code || '',
            size: item.sizes ? item.sizes.split(',').map(size => size.trim()) : ['7', '8', '9', '10'],
            description: item.description || '',
            status: item.status || 'approved'
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 6. POST - Add a product
app.post('/api/product', async (req, res) => {
    try {
        const data = req.body;

        const sizes = Array.isArray(data.size) ? data.size.join(', ') : '';
        const sellerId = data.sellerId || null;
        const status = data.status || (sellerId ? 'pending' : 'approved');

        const sql = `
            INSERT INTO products
            (seller_id, product_name, brand, brand_code, sell_price, stock, sizes, image, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            sellerId,
            data.product,
            data.brand || '',
            data.code || '',
            Number(data.sell || 0),
            Number(data.stock || 0),
            sizes,
            data.image || '',
            data.description || '',
            status
        ];

        const [result] = await db.query(sql, values);

        res.status(201).json({
            id: result.insertId,
            product: data.product,
            sell: String(data.sell || 0),
            stock: String(data.stock || 0),
            image: data.image || '',
            sellerId,
            brand: data.brand || '',
            code: data.code || '',
            size: Array.isArray(data.size) ? data.size : ['7', '8', '9', '10'],
            description: data.description || '',
            status
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 7. PUT - Update a product
app.put('/api/product/:id', async (req, res) => {
    try {
        const data = req.body;
        const sizes = Array.isArray(data.size) ? data.size.join(', ') : '';

        const sql = `
            UPDATE products SET
            seller_id = ?, product_name = ?, brand = ?, brand_code = ?,
            sell_price = ?, stock = ?, sizes = ?, image = ?, description = ?, status = ?
            WHERE product_id = ?
        `;

        const values = [
            data.sellerId || null,
            data.product,
            data.brand || '',
            data.code || '',
            Number(data.sell || 0),
            Number(data.stock || 0),
            sizes,
            data.image || '',
            data.description || '',
            data.status || 'pending',
            req.params.id
        ];

        await db.query(sql, values);
        res.json({ message: 'Product Updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 8. DELETE - Delete a product
app.delete('/api/product/:id', async (req, res) => {
    try {
        await db.query(
            'DELETE FROM products WHERE product_id = ?',
            [req.params.id]
        );

        res.json({ message: 'Product Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 9. Start the server
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
