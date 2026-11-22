// 1. Load environment variables and import packages
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the full Firebase service-account JSON into Render Environment.');
    }
} else {
    const localServiceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(localServiceAccountPath)) {
        throw new Error('Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT in Render Environment, or provide bakend/serviceAccountKey.json for local development.');
    }
    serviceAccount = require(localServiceAccountPath);
}

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

// 4. Connect to MySQL: local XAMPP by default, or TiDB Cloud when DB_MODE=tidb.
// Keep the existing DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME variables
// for local development so the current XAMPP setup continues to work.
const dbMode = String(process.env.DB_MODE || 'local').trim().toLowerCase();
let dbConfig;

if (dbMode === 'local') {
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'shoe_inventory_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
} else if (dbMode === 'tidb') {
    const requiredTiDBSettings = ['TIDB_HOST', 'TIDB_USER', 'TIDB_PASSWORD'];
    const missingTiDBSettings = requiredTiDBSettings.filter(name => !process.env[name]);
    if (missingTiDBSettings.length) {
        throw new Error('DB_MODE=tidb requires these environment variables: ' + missingTiDBSettings.join(', '));
    }

    dbConfig = {
        host: process.env.TIDB_HOST,
        port: Number(process.env.TIDB_PORT || 4000),
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DATABASE || 'shoe_inventory_db',
        // TiDB Cloud requires encrypted connections. mysql2 negotiates TLS
        // using the trusted certificate store provided by the Node.js runtime.
        ssl: { minVersion: 'TLSv1.2' },
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    };
} else {
    throw new Error('Invalid DB_MODE. Use "local" or "tidb".');
}

console.log('Database mode:', dbMode);
const db = mysql.createPool(dbConfig);

// Public health endpoint for Render. Reports API and database status without
// exposing credentials or internal connection details.
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({
            status: 'ok',
            api: 'up',
            database: 'connected'
        });
    } catch (error) {
        console.error('Health check database failure:', error.message);
        res.status(503).json({
            status: 'error',
            api: 'up',
            database: 'disconnected'
        });
    }
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

// Return the database-managed role for the verified Firebase account.
app.get('/api/auth/me', requireFirebaseUser, async (req, res) => {
    try {
        const currentUser = await getDatabaseUser(req.firebaseUser.uid);
        if (!currentUser) return res.status(403).json({ message: 'Your account is not active or is not registered.' });
        res.json({ uid: currentUser.firebase_uid, role: currentUser.role });
    } catch (error) {
        console.error('Load account role failed:', error.message);
        res.status(500).json({ message: 'Could not load account role.' });
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

// Persistent notifications and saved addresses for the authenticated account.
async function insertNotification(executor, uid, title, message, type, orderId = null) {
    await executor.query(
        'INSERT INTO notifications (firebase_uid, title, message, notification_type, related_order_id) VALUES (?, ?, ?, ?, ?)',
        [uid, title, message, type, orderId]
    );
}

app.get('/api/addresses', requireFirebaseUser, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT address_id, recipient_name, phone, address_line, city, province, postal_code, is_default, created_at, updated_at FROM addresses WHERE firebase_uid = ? ORDER BY is_default DESC, updated_at DESC',
            [req.firebaseUser.uid]
        );
        res.json(rows);
    } catch (error) {
        console.error('Get addresses failed:', error.message);
        res.status(500).json({ message: 'Could not load saved addresses.' });
    }
});

app.get('/api/notifications', requireFirebaseUser, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT notification_id, title, message, notification_type, related_order_id, is_read, created_at FROM notifications WHERE firebase_uid = ? ORDER BY created_at DESC, notification_id DESC',
            [req.firebaseUser.uid]
        );
        res.json(rows.map(row => ({
            id: String(row.notification_id), title: row.title, message: row.message,
            type: row.notification_type || 'update',
            orderId: row.related_order_id ? String(row.related_order_id) : null,
            read: Boolean(row.is_read), createdAt: row.created_at
        })));
    } catch (error) {
        console.error('Get notifications failed:', error.message);
        res.status(500).json({ message: 'Could not load notifications.' });
    }
});

app.patch('/api/notifications/read', requireFirebaseUser, async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : null;
        if (ids && ids.length) {
            const marks = ids.map(() => '?').join(',');
            await db.query('UPDATE notifications SET is_read = 1 WHERE firebase_uid = ? AND notification_id IN (' + marks + ')', [req.firebaseUser.uid, ...ids]);
        } else if (!ids) {
            await db.query('UPDATE notifications SET is_read = 1 WHERE firebase_uid = ?', [req.firebaseUser.uid]);
        }
        res.json({ message: 'Notifications marked as read.' });
    } catch (error) {
        console.error('Mark notifications read failed:', error.message);
        res.status(500).json({ message: 'Could not update notifications.' });
    }
});

app.post('/api/addresses', requireFirebaseUser, async (req, res) => {
    const data = req.body || {};
    const recipientName = String(data.recipientName || '').trim();
    const phone = String(data.phone || '').trim();
    const addressLine = String(data.addressLine || '').trim();
    if (!recipientName || !phone || !addressLine) {
        return res.status(400).json({ message: 'Recipient name, phone, and address are required.' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (data.isDefault !== false) {
            await connection.query('UPDATE addresses SET is_default = 0 WHERE firebase_uid = ?', [req.firebaseUser.uid]);
        }
        const [result] = await connection.query(
            'INSERT INTO addresses (firebase_uid, recipient_name, phone, address_line, city, province, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.firebaseUser.uid, recipientName, phone, addressLine, data.city || null, data.province || null, data.postalCode || null, data.isDefault === false ? 0 : 1]
        );
        await connection.commit();
        const [rows] = await db.query('SELECT address_id, recipient_name, phone, address_line, city, province, postal_code, is_default, created_at, updated_at FROM addresses WHERE address_id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Save address failed:', error.message);
        res.status(500).json({ message: 'Could not save address.' });
    } finally {
        connection.release();
    }
});

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
            return res.status(403).json({ message: 'Your account is not active or is not registered.' });
        }

        const buyer = req.body?.buyer || {};
        const paymentMethod = String(req.body?.paymentMethod || '').trim();
        const requestedItems = req.body?.items;
        if (!buyer.name?.trim() || !buyer.address?.trim() || !buyer.contactNumber?.trim()) {
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

        // Save the buyer's latest checkout address as their default address.
        await connection.query('UPDATE addresses SET is_default = 0 WHERE firebase_uid = ?', [req.firebaseUser.uid]);
        await connection.query(
            'INSERT INTO addresses (firebase_uid, recipient_name, phone, address_line, is_default) VALUES (?, ?, ?, ?, 1)',
            [req.firebaseUser.uid, buyer.name.trim(), buyer.contactNumber.trim(), buyer.address.trim()]
        );

        // Record the selected payment method. This does not verify GCash or Maya payment.
        await connection.query(
            'INSERT INTO payments (order_id, payment_method, amount, payment_status) VALUES (?, ?, ?, ?)',
            [orderResult.insertId, paymentMethod, total, 'Pending']
        );

        await insertNotification(
            connection, req.firebaseUser.uid, 'Order placed successfully',
            'Your order ' + orderNumber + ' has been placed and is awaiting processing.',
            'order', orderResult.insertId
        );
        const [sellerRows] = await connection.query(
            'SELECT DISTINCT seller_id FROM order_items WHERE order_id = ? AND seller_id IS NOT NULL',
            [orderResult.insertId]
        );
        for (const seller of sellerRows) {
            await insertNotification(
                connection, seller.seller_id, 'New customer order',
                'You received a new order (' + orderNumber + ').',
                'order', orderResult.insertId
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
            if (!['Processing', 'Shipped', 'Delivered'].includes(status)) {
                throw new Error('Sellers can only move their orders to Processing, Shipped, or Delivered.');
            }
        } else if (currentUser.role !== 'admin') {
            if (order.buyer_id !== req.firebaseUser.uid || status !== 'Cancelled') {
                throw new Error('Buyers can only cancel their own orders.');
            }
            if (!['New', 'Processing'].includes(order.status)) {
                throw new Error('This order can no longer be cancelled.');
            }
        }

        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.order_id]);
            for (const item of items) {
                await connection.query('UPDATE products SET stock = stock + ? WHERE product_id = ?', [item.quantity, item.product_id]);
            }
        }
        await connection.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, order.order_id]);
        await connection.query('UPDATE order_items SET status = ? WHERE order_id = ?', [status, order.order_id]);

        await insertNotification(
            connection,
            order.buyer_id,
            status === 'Cancelled' ? 'Order cancelled' : 'Order status updated',
            'Your order ' + order.order_number + ' is now ' + status + '.',
            status === 'Cancelled' ? 'cancel' : 'order',
            order.order_id
        );
        const [sellerRows] = await connection.query(
            'SELECT DISTINCT seller_id FROM order_items WHERE order_id = ? AND seller_id IS NOT NULL',
            [order.order_id]
        );
        for (const seller of sellerRows) {
            await insertNotification(
                connection, seller.seller_id, 'Order status updated',
                'Order ' + order.order_number + ' is now ' + status + '.',
                status === 'Cancelled' ? 'cancel' : 'order', order.order_id
            );
        }
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
