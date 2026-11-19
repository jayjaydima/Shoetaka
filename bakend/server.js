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

// Resolve authorization from MySQL. Never trust a role sent by the browser.
async function getDatabaseUser(firebaseUid) {
    const [rows] = await db.query(
        'SELECT firebase_uid, role, account_status FROM users WHERE firebase_uid = ? LIMIT 1',
        [firebaseUid]
    );
    if (!rows.length || rows[0].account_status !== 'active') return null;
    return rows[0];
}

function mapOrderRows(orderRows, itemRows) {
    return orderRows.map(order => ({
        id: String(order.order_id),
        orderNumber: order.order_number,
        userId: order.buyer_id,
        userEmail: order.buyer_email || '',
        buyer: {
            name: order.buyer_name,
            address: order.delivery_address,
            contactNumber: order.contact_number
        },
        paymentMethod: order.payment_method,
        total: Number(order.total),
        status: order.status,
        placedAt: order.created_at,
        updatedAt: order.updated_at,
        items: itemRows
            .filter(item => Number(item.order_id) === Number(order.order_id))
            .map(item => ({
                id: String(item.order_item_id),
                productId: item.product_id,
                sellerId: item.seller_id,
                name: item.product_name,
                img: item.image || '',
                price: Number(item.unit_price),
                size: item.shoe_size || '',
                qty: Number(item.quantity)
            }))
    }));
}

// 6. GET - Orders visible to the authenticated buyer, seller, or admin.
app.get('/api/orders', requireFirebaseUser, async (req, res) => {
    try {
        const currentUser = await getDatabaseUser(req.firebaseUser.uid);
        if (!currentUser) {
            return res.status(403).json({ message: 'Your account is not active or is not registered.' });
        }

        let orderRows;
        if (currentUser.role === 'admin') {
            [orderRows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        } else if (currentUser.role === 'seller') {
            [orderRows] = await db.query(
                'SELECT DISTINCT o.* FROM orders o INNER JOIN order_items oi ON oi.order_id = o.order_id WHERE oi.seller_id = ? ORDER BY o.created_at DESC',
                [req.firebaseUser.uid]
            );
        } else {
            [orderRows] = await db.query(
                'SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC',
                [req.firebaseUser.uid]
            );
        }

        if (!orderRows.length) return res.json([]);
        const ids = orderRows.map(order => order.order_id);
        const placeholders = ids.map(() => '?').join(',');
        let itemSql = `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY order_item_id ASC`;
        const itemParams = [...ids];
        if (currentUser.role === 'seller') {
            itemSql = `SELECT * FROM order_items WHERE order_id IN (${placeholders}) AND seller_id = ? ORDER BY order_item_id ASC`;
            itemParams.push(req.firebaseUser.uid);
        }
        const [itemRows] = await db.query(itemSql, itemParams);
        res.json(mapOrderRows(orderRows, itemRows));
    } catch (error) {
        console.error('Get orders failed:', error.message);
        res.status(500).json({ message: 'Could not load orders.' });
    }
});

// 7. POST - Place an order. Product prices, seller IDs, and stock are read from MySQL.
app.post('/api/orders', requireFirebaseUser, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const currentUser = await getDatabaseUser(req.firebaseUser.uid);
        if (!currentUser) {
            connection.release();
            return res.status(403).json({ message: 'Your account is not active or is not registered.' });
        }

        const buyer = req.body?.buyer || {};
        const paymentMethod = String(req.body?.paymentMethod || '').trim();
        const requestedItems = req.body?.items;
        if (!buyer.name?.trim() || !buyer.address?.trim() || !buyer.contactNumber?.trim()) {
            connection.release();
            return res.status(400).json({ message: 'Buyer name, delivery address, and contact number are required.' });
        }
        if (!['GCash', 'Maya', 'COD'].includes(paymentMethod)) {
            connection.release();
            return res.status(400).json({ message: 'Invalid payment method.' });
        }
        if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
            connection.release();
            return res.status(400).json({ message: 'At least one order item is required.' });
        }

        await connection.beginTransaction();
        const verifiedItems = [];
        for (const requested of requestedItems) {
            const productId = String(requested.productId || '').trim();
            const quantity = Number(requested.qty);
            const size = String(requested.size || '').trim();
            if (!productId || !Number.isInteger(quantity) || quantity < 1) {
                throw new Error('Invalid product or quantity in the order.');
            }

            const [products] = await connection.query(
                'SELECT product_id, seller_id, product_name, sell_price, stock, image, status FROM products WHERE product_id = ? FOR UPDATE',
                [productId]
            );
            if (!products.length) throw new Error(`Product ${productId} was not found.`);
            const product = products[0];
            if (!product.seller_id) {
                throw new Error(`Product "${product.product_name}" has no assigned seller. Please contact the shop administrator.`);
            }
            if (product.status && product.status !== 'approved') {
                throw new Error(`Product "${product.product_name}" is not available for ordering.`);
            }
            if (Number(product.stock) < quantity) {
                throw new Error(`Not enough stock for "${product.product_name}".`);
            }
            const price = Number(product.sell_price);
            verifiedItems.push({
                productId: product.product_id,
                sellerId: product.seller_id,
                name: product.product_name,
                image: product.image || null,
                price,
                size: size || null,
                qty: quantity,
                lineTotal: Number((price * quantity).toFixed(2))
            });
        }

        const total = Number(verifiedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
        const orderNumber = `ORD-${Date.now().toString(36).slice(-6).toUpperCase()}`;
        const [orderResult] = await connection.query(
            'INSERT INTO orders (order_number, buyer_id, buyer_email, buyer_name, delivery_address, contact_number, payment_method, status, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                orderNumber,
                req.firebaseUser.uid,
                req.firebaseUser.email || null,
                buyer.name.trim(),
                buyer.address.trim(),
                buyer.contactNumber.trim(),
                paymentMethod,
                'New',
                total
            ]
        );

        for (const item of verifiedItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, seller_id, product_name, image, unit_price, shoe_size, quantity, line_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    orderResult.insertId,
                    item.productId,
                    item.sellerId,
                    item.name,
                    item.image,
                    item.price,
                    item.size,
                    item.qty,
                    item.lineTotal,
                    'New'
                ]
            );
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE product_id = ?',
                [item.qty, item.productId]
            );
        }

        await connection.commit();
        const [savedOrders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderResult.insertId]);
        const [savedItems] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderResult.insertId]);
        res.status(201).json(mapOrderRows(savedOrders, savedItems)[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Place order failed:', error.message);
        res.status(400).json({ message: error.message || 'Could not place order.' });
    } finally {
        connection.release();
    }
});

// 8. PUT - Update order status. Admins can update any order; sellers only their own items.
app.put('/api/orders/:id/status', requireFirebaseUser, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const currentUser = await getDatabaseUser(req.firebaseUser.uid);
        if (!currentUser) {
            connection.release();
            return res.status(403).json({ message: 'Your account is not active or is not registered.' });
        }
        const status = String(req.body?.status || '');
        if (!['New', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
            connection.release();
            return res.status(400).json({ message: 'Invalid order status.' });
        }

        await connection.beginTransaction();
        const [orders] = await connection.query('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [req.params.id]);
        if (!orders.length) throw new Error('Order not found.');
        const order = orders[0];

        if (currentUser.role === 'seller') {
            const [ownedItems] = await connection.query(
                'SELECT order_item_id FROM order_items WHERE order_id = ? AND seller_id = ?',
                [order.order_id, req.firebaseUser.uid]
            );
            if (!ownedItems.length) throw new Error('You do not have permission to update this order.');
            if (status === 'Cancelled') throw new Error('Only the buyer or admin can cancel an order.');
        } else if (currentUser.role !== 'admin' && order.buyer_id !== req.firebaseUser.uid) {
            throw new Error('You do not have permission to update this order.');
        }

        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.order_id]);
            for (const item of items) {
                await connection.query('UPDATE products SET stock = stock + ? WHERE product_id = ?', [item.quantity, item.product_id]);
            }
        }
        await connection.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, order.order_id]);
        await connection.query('UPDATE order_items SET status = ? WHERE order_id = ?', [status, order.order_id]);
        await connection.commit();
        res.json({ message: 'Order status updated.', status });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message || 'Could not update order status.' });
    } finally {
        connection.release();
    }
});

// 9. GET - Get all products
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
