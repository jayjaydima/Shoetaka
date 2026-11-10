// 1. Import packages
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

// 2. Create the server
const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// 3. Connect to MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'shoe_inventory_db'
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

// 4. GET - Get all products
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

// 5. POST - Add a product
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

// 6. PUT - Update a product
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

// 7. DELETE - Delete a product
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

// 8. Start the server
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
