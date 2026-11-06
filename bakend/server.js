const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Log API requests so failed requests can be traced in the backend terminal.
app.use('/api', (req, res, next) => {
    console.log(`API ${req.method} ${req.originalUrl}`);
    next();
});

app.use(express.json({ limit: '25mb' }));

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
        // Accept both the current React field names and common form field aliases.
        const body = req.body || {};
        const productValue = body.product ?? body.name ?? body.productName ?? body.product_name ?? body.shoeName ?? body.title ?? body.productData?.name ?? '';
        const product = String(typeof productValue === 'object' && productValue !== null ? (productValue.name ?? '') : productValue).trim();
        console.log('Add product fields received:', Object.keys(body));
        const buy = Number(req.body.buy ?? req.body.buyPrice ?? 0);
        const sell = Number(req.body.sell ?? req.body.priceValue ?? req.body.price ?? 0);
        const stock = Number(req.body.stock ?? 0);
        const image = String(req.body.image ?? '');
        const sellerId = req.body.sellerId ? String(req.body.sellerId) : null;
        const requestedStatus = req.body.status;
        const status = ['pending', 'approved', 'rejected'].includes(requestedStatus)
            ? requestedStatus
            : (sellerId ? 'pending' : 'approved');

        if (!product) {
            return res.status(400).json({ message: 'Product name is required.' });
        }
        if (product.length > 100) {
            return res.status(400).json({ message: 'Product name must be 100 characters or fewer.' });
        }
        if (!Number.isFinite(buy) || buy < 0 || !Number.isFinite(sell) || sell < 0) {
            return res.status(400).json({ message: 'Buy and sell prices must be valid non-negative numbers.' });
        }
        if (!Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: 'Stock must be a non-negative whole number.' });
        }

        const [result] = await db.query(
            'INSERT INTO products (seller_id, product_name, buy_price, sell_price, stock, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sellerId, product, buy, sell, stock, image, status]
        );

        console.log('Product inserted into MySQL. product_id:', result.insertId);
        res.status(201).json({
            id: result.insertId,
            product,
            buy: String(buy),
            sell: String(sell),
            stock: String(stock),
            image,
            sellerId,
            status
        });
    } catch (error) {
        console.error('POST /api/product MySQL error:', error.code || '', error.message);
        res.status(500).json({
            message: 'Hindi na-save ang product sa MySQL.',
            details: error.message,
            code: error.code || null
        });
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

// Return a readable error when a request contains invalid JSON.
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('Invalid JSON request:', error.message);
        return res.status(400).json({
            message: 'Invalid JSON sent by the frontend. Please check the request body.',
            details: error.message
        });
    }

    if (error) {
        console.error('Server error:', error.message);
        return res.status(error.status || 500).json({
            message: error.message || 'Internal server error.'
        });
    }

    next();
});

app.listen(PORT, () => {
    console.log(`Server running ${PORT}`);
});
