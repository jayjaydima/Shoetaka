const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use('/api', (req, res, next) => {
    console.log(`API ${req.method} ${req.originalUrl}`);
    next();
});
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
    .catch(error => console.log('Database Connection Failed:', error.message));

function toSizeArray(value) {
    if (Array.isArray(value)) return value.map(String).map(size => size.trim()).filter(Boolean);
    if (typeof value !== 'string' || !value.trim()) return [];
    return value.split(',').map(size => size.trim()).filter(Boolean);
}

app.get('/api/product', async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products');
        res.json(products.map(product => ({
            id: Number(product.product_id),
            product: product.product_name,
            sell: String(product.sell_price ?? '0'),
            stock: String(product.stock ?? '0'),
            image: product.image || '',
            sellerId: product.seller_id || null,
            brand: product.brand || '',
            code: product.brand_code || '',
            size: toSizeArray(product.sizes),
            description: product.description || '',
            status: product.status || 'approved',
            rejectionReason: ''
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/product', async (req, res) => {
    try {
        const body = req.body || {};
        const productValue = body.product ?? body.name ?? body.productName ?? body.product_name ?? body.shoeName ?? body.title ?? body.productData?.name ?? '';
        const product = String(typeof productValue === 'object' && productValue !== null ? (productValue.name ?? '') : productValue).trim();
        console.log('Add product fields received:', Object.keys(body));

        const sell = Number(body.sell ?? body.priceValue ?? body.price ?? 0);
        const stock = Number(body.stock ?? 0);
        const image = String(body.image ?? '');
        const sellerId = body.sellerId ? String(body.sellerId) : null;
        const brand = String(body.brand ?? '').trim();
        const code = String(body.code ?? body.brandCode ?? body.brand_code ?? '').trim();
        const sizes = toSizeArray(body.size ?? body.sizes).join(',');
        const description = String(body.description ?? '');
        const requestedStatus = body.status;
        const status = ['pending', 'approved', 'rejected'].includes(requestedStatus)
            ? requestedStatus
            : (sellerId ? 'pending' : 'approved');

        if (!product) return res.status(400).json({ message: 'Product name is required.' });
        if (product.length > 100) return res.status(400).json({ message: 'Product name must be 100 characters or fewer.' });
        if (!Number.isFinite(sell) || sell < 0) return res.status(400).json({ message: 'Selling price must be a valid non-negative number.' });
        if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ message: 'Stock must be a non-negative whole number.' });

        const [result] = await db.query(
            'INSERT INTO products (seller_id, product_name, brand, brand_code, sell_price, stock, sizes, image, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sellerId, product, brand || null, code || null, sell, stock, sizes || null, image, description || null, status]
        );

        console.log('Product inserted into MySQL. product_id:', result.insertId);
        res.status(201).json({
            id: result.insertId, product, sell: String(sell), stock: String(stock),
            image, sellerId, brand, code, size: toSizeArray(sizes), description, status
        });
    } catch (error) {
        console.error('POST /api/product MySQL error:', error.code || '', error.message);
        res.status(500).json({ message: 'Hindi na-save ang product sa MySQL.', details: error.message, code: error.code || null });
    }
});

app.put('/api/product/:id', async (req, res) => {
    try {
        const body = req.body || {};
        const productValue = body.product ?? body.name ?? body.productName ?? '';
        const product = String(typeof productValue === 'object' && productValue !== null ? (productValue.name ?? '') : productValue).trim();
        const sell = Number(body.sell ?? body.priceValue ?? body.price ?? 0);
        const stock = Number(body.stock ?? 0);
        const image = String(body.image ?? '');
        const sellerId = body.sellerId ? String(body.sellerId) : null;
        const brand = String(body.brand ?? '').trim();
        const code = String(body.code ?? body.brandCode ?? body.brand_code ?? '').trim();
        const sizes = toSizeArray(body.size ?? body.sizes).join(',');
        const description = String(body.description ?? '');
        const status = ['pending', 'approved', 'rejected'].includes(body.status) ? body.status : 'pending';

        if (!product) return res.status(400).json({ message: 'Product name is required.' });
        if (product.length > 100) return res.status(400).json({ message: 'Product name must be 100 characters or fewer.' });
        if (!Number.isFinite(sell) || sell < 0) return res.status(400).json({ message: 'Selling price must be a valid non-negative number.' });
        if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ message: 'Stock must be a non-negative whole number.' });

        const [result] = await db.query(
            'UPDATE products SET seller_id = ?, product_name = ?, brand = ?, brand_code = ?, sell_price = ?, stock = ?, sizes = ?, image = ?, description = ?, status = ? WHERE product_id = ?',
            [sellerId, product, brand || null, code || null, sell, stock, sizes || null, image, description || null, status, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found.' });
        res.json({ message: 'Product Updated' });
    } catch (error) {
        console.error('PUT /api/product MySQL error:', error.code || '', error.message);
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/product/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
        res.json({ message: 'Product Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', name: 'shoe_inventory_db' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', message: error.message });
    }
});

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('Invalid JSON request:', error.message);
        return res.status(400).json({ message: 'Invalid JSON sent by the frontend. Please check the request body.', details: error.message });
    }
    if (error) {
        console.error('Server error:', error.message);
        return res.status(error.status || 500).json({ message: error.message || 'Internal server error.' });
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Server running ${PORT}`);
});
