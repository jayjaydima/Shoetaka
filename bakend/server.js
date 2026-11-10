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
        res.json(products.map(product => {
            let sizes = ['7', '8', '9', '10'];
            try {
                if (product.sizes) {
                    const parsed = JSON.parse(product.sizes);
                    sizes = Array.isArray(parsed) ? parsed.map(String) : String(product.sizes).split(',').map(v => v.trim()).filter(Boolean);
                }
            } catch {
                sizes = String(product.sizes).split(',').map(v => v.trim()).filter(Boolean);
            }
            return {
                id: Number(product.product_id),
                product: product.product_name,
                buy: String(product.buy_price ?? '0'),
                sell: String(product.sell_price ?? '0'),
                stock: String(product.stock ?? '0'),
                image: product.image || '',
                sellerId: product.seller_id || null,
                brand: product.brand || '',
                code: product.brand_code || '',
                size: sizes,
                description: product.description || '',
                status: product.status || 'approved',
                rejectionReason: ''
            };
        }));
    } catch (error) {
        console.error('GET /api/product MySQL error:', error.code || '', error.message);
        res.status(500).json({ message: error.message, code: error.code || null });
    }
});

// ADD product
app.post('/api/product', async (req, res) => {
    try {
        const body = req.body || {};
        const productValue = body.product ?? body.name ?? body.productName ?? body.product_name ?? body.shoeName ?? body.title ?? body.productData?.name ?? '';
        const product = String(typeof productValue === 'object' && productValue !== null ? (productValue.name ?? '') : productValue).trim();
        const buy = Number(body.buy ?? body.buyPrice ?? 0);
        const sell = Number(body.sell ?? body.priceValue ?? body.price ?? 0);
        const stock = Number(body.stock ?? 0);
        const image = String(body.image ?? '');
        const brand = String(body.brand ?? '').trim();
        const brandCode = String(body.code ?? body.brand_code ?? '').trim();
        const sizes = JSON.stringify(Array.isArray(body.size) ? body.size.map(String) : (body.size ? String(body.size).split(',').map(v => v.trim()).filter(Boolean) : []));
        const description = String(body.description ?? '');
        const sellerId = body.sellerId ? String(body.sellerId) : null;
        const requestedStatus = body.status;
        const status = ['pending', 'approved', 'rejected'].includes(requestedStatus) ? requestedStatus : (sellerId ? 'pending' : 'approved');

        if (!product) return res.status(400).json({ message: 'Product name is required.' });
        if (product.length > 120) return res.status(400).json({ message: 'Product name must be 120 characters or fewer.' });
        if (!Number.isFinite(buy) || buy < 0 || !Number.isFinite(sell) || sell < 0) return res.status(400).json({ message: 'Buy and sell prices must be valid non-negative numbers.' });
        if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ message: 'Stock must be a non-negative whole number.' });

        const [result] = await db.query(
            'INSERT INTO products (seller_id, product_name, brand, brand_code, buy_price, sell_price, stock, sizes, image, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sellerId, product, brand, brandCode, buy, sell, stock, sizes, image, description, status]
        );
        console.log('Product inserted into MySQL. product_id:', result.insertId);
        res.status(201).json({
            id: result.insertId, product, buy: String(buy), sell: String(sell),
            stock: String(stock), image, sellerId, brand, code: brandCode,
            size: JSON.parse(sizes), description, status
        });
    } catch (error) {
        console.error('POST /api/product MySQL error:', error.code || '', error.message);
        res.status(500).json({ message: 'Hindi na-save ang product sa MySQL.', details: error.message, code: error.code || null });
    }
});

// UPDATE product
app.put('/api/product/:id', async (req, res) => {
    try {
        const body = req.body || {};
        const product = String(body.product ?? body.name ?? body.productName ?? '').trim();
        const buy = Number(body.buy ?? 0);
        const sell = Number(body.sell ?? body.priceValue ?? 0);
        const stock = Number(body.stock ?? 0);
        const image = String(body.image ?? '');
        const brand = String(body.brand ?? '').trim();
        const brandCode = String(body.code ?? body.brand_code ?? '').trim();
        const sizes = JSON.stringify(Array.isArray(body.size) ? body.size.map(String) : (body.size ? String(body.size).split(',').map(v => v.trim()).filter(Boolean) : []));
        const description = String(body.description ?? '');
        const sellerId = body.sellerId || null;
        const status = ['pending', 'approved', 'rejected'].includes(body.status) ? body.status : 'pending';

        if (!product) return res.status(400).json({ message: 'Product name is required.' });
        if (!Number.isFinite(buy) || buy < 0 || !Number.isFinite(sell) || sell < 0) return res.status(400).json({ message: 'Prices must be valid non-negative numbers.' });
        if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ message: 'Stock must be a non-negative whole number.' });

        await db.query(
            'UPDATE products SET seller_id = ?, product_name = ?, brand = ?, brand_code = ?, buy_price = ?, sell_price = ?, stock = ?, sizes = ?, image = ?, description = ?, status = ? WHERE product_id = ?',
            [sellerId, product, brand, brandCode, buy, sell, stock, sizes, image, description, status, req.params.id]
        );
        res.json({ message: 'Product Updated' });
    } catch (error) {
        console.error('PUT /api/product MySQL error:', error.code || '', error.message);
        res.status(500).json({ message: error.message, code: error.code || null });
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
