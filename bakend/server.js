const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'shoe_inventory_db'
});

db.getConnection()
    .then(connection => {
        console.log('Database Connected');
        connection.release();
    })
    .catch(error => console.log('Database error:', error.message));

// Convert shoe sizes between the React array and MySQL text column.
const saveSizes = sizes => Array.isArray(sizes) ? sizes.join(', ') : (sizes || '');
const readSizes = sizes => sizes ? sizes.split(',').map(size => size.trim()).filter(Boolean) : ['7', '8', '9', '10'];

// GET all products
app.get('/api/product', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products');
        res.json(rows.map(row => ({
            id: row.product_id,
            product: row.product_name,
            sell: String(row.sell_price || 0),
            stock: String(row.stock || 0),
            image: row.image || '',
            sellerId: row.seller_id,
            brand: row.brand || '',
            code: row.brand_code || '',
            size: readSizes(row.sizes),
            description: row.description || '',
            status: row.status || 'approved'
        })));
    } catch (error) {
        console.error('GET products:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// ADD product
app.post('/api/product', async (req, res) => {
    try {
        const data = req.body;
        const product = String(data.product || data.name || data.productName || '').trim();
        const sell = Number(data.sell || data.priceValue || data.price || 0);
        const stock = Number(data.stock || 0);
        const sellerId = data.sellerId || null;
        const status = data.status || (sellerId ? 'pending' : 'approved');

        if (!product || !Number.isFinite(sell) || sell < 0 || !Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: 'Check product name, selling price, and stock.' });
        }

        const values = [
            sellerId, product, data.brand || '', data.code || '',
            sell, stock, saveSizes(data.size || data.sizes),
            data.image || '', data.description || '', status
        ];

        const [result] = await db.query(
            'INSERT INTO products (seller_id, product_name, brand, brand_code, sell_price, stock, sizes, image, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            values
        );

        res.status(201).json({
            id: result.insertId,
            product,
            sell: String(sell),
            stock: String(stock),
            image: data.image || '',
            sellerId,
            brand: data.brand || '',
            code: data.code || '',
            size: readSizes(saveSizes(data.size || data.sizes)),
            description: data.description || '',
            status
        });
    } catch (error) {
        console.error('POST product:', error.message);
        res.status(500).json({ message: 'Hindi na-save ang product sa MySQL.', details: error.message });
    }
});

// UPDATE product
app.put('/api/product/:id', async (req, res) => {
    try {
        const data = req.body;
        const product = String(data.product || data.name || '').trim();
        const sell = Number(data.sell || data.priceValue || data.price || 0);
        const stock = Number(data.stock || 0);

        if (!product || !Number.isFinite(sell) || sell < 0 || !Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: 'Check product name, selling price, and stock.' });
        }

        await db.query(
            'UPDATE products SET seller_id = ?, product_name = ?, brand = ?, brand_code = ?, sell_price = ?, stock = ?, sizes = ?, image = ?, description = ?, status = ? WHERE product_id = ?',
            [
                data.sellerId || null, product, data.brand || '', data.code || '',
                sell, stock, saveSizes(data.size || data.sizes), data.image || '',
                data.description || '', data.status || 'pending', req.params.id
            ]
        );

        res.json({ message: 'Product Updated' });
    } catch (error) {
        console.error('PUT product:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// DELETE product
app.delete('/api/product/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
        res.json({ message: 'Product Deleted' });
    } catch (error) {
        console.error('DELETE product:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Check MySQL connection
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
