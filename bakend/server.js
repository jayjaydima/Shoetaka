const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Connect to the existing XAMPP database
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
    .catch(error => console.log('Database Connection Failed:', error.message));

// GET all products
app.get('/api/product', async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products');

        res.json(products.map(product => ({
            id: Number(product.product_id),
            product: product.product_name,
            buy: String(product.buy_price ?? '0'),
            sell: String(product.sell_price ?? '0'),
            stock: String(product.stock ?? '0'),
            image: product.image || '',
            sellerId: product.seller_id || null,
            brand: '',
            code: '',
            size: ['7', '8', '9', '10'],
            description: '',
            status: product.status || 'approved',
            rejectionReason: ''
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADD product
app.post('/api/product', async (req, res) => {
    try {
        const { product, buy, sell, stock, image, sellerId, status } = req.body;

        const [result] = await db.query(
            'INSERT INTO products (seller_id, product_name, buy_price, sell_price, stock, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sellerId || null, product, buy || 0, sell || 0, stock || 0, image || '', status || 'pending']
        );

        res.json({ id: result.insertId, product, buy, sell, stock, image, sellerId, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE product
app.put('/api/product/:id', async (req, res) => {
    try {
        const { product, buy, sell, stock, image, sellerId, status } = req.body;

        await db.query(
            'UPDATE products SET seller_id = ?, product_name = ?, buy_price = ?, sell_price = ?, stock = ?, image = ?, status = ? WHERE product_id = ?',
            [sellerId || null, product, buy || 0, sell || 0, stock || 0, image || '', status || 'pending', req.params.id]
        );

        res.json({ message: 'Product Updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE product
app.delete('/api/product/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
        res.json({ message: 'Product Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Check database connection
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', name: 'shoe_inventory_db' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running ${PORT}`);
});
