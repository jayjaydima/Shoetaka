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

// Verify Firebase ID tokens before allowing access to protected endpoints.
async function requireFirebaseUser(req, res, next) {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : '';

    if (!token) {
        return res.status(401).json({ message: 'Missing Firebase ID token.' });
    }

    try {
        req.firebaseUser = await auth.verifyIdToken(token);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired Firebase ID token.' });
    }
}

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

// 5. POST - Create or update the signed-in user's MySQL profile.
// UID and email come from the verified Firebase token, never from the request body.
// Existing role and account_status values are deliberately preserved.
app.post('/api/auth/sync', requireFirebaseUser, async (req, res) => {
    try {
        const firebaseUser = req.firebaseUser;
        const requestedName = typeof req.body?.displayName === 'string'
            ? req.body.displayName.trim()
            : '';
        const requestedPhone = typeof req.body?.phone === 'string'
            ? req.body.phone.trim()
            : '';
        const email = firebaseUser.email || '';
        const fullName = requestedName || firebaseUser.name ||
            (email ? email.split('@')[0] : 'Shoe-Taka User');

        await db.query(
            `
                INSERT INTO users (firebase_uid, full_name, email, phone)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    email = VALUES(email),
                    phone = VALUES(phone)
            `,
            [firebaseUser.uid, fullName, email, requestedPhone || null]
        );

        res.json({
            message: 'User profile synced successfully.',
            firebaseUid: firebaseUser.uid
        });
    } catch (error) {
        console.error('User profile sync failed:', error.message);
        res.status(500).json({ message: 'Could not sync user profile to the database.' });
    }
});

// 6. GET - Get all products
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

// 7. POST - Add a product
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

// 8. PUT - Update a product
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

// 9. DELETE - Delete a product
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

// 10. Start the server
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
