const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Connect to the existing XAMPP database: shoe_inventory_db.
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "shoe_inventory_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Translate the existing MySQL column names to the API fields used by React.
function toProduct(row) {
    return {
        ...row,
        id: Number(row.product_id),
        product: row.product_name || "",
        buy: String(row.buy_price ?? "0"),
        sell: String(row.sell_price ?? "0"),
        stock: String(row.stock ?? "0"),
        image: row.image || "",
        sellerId: row.seller_id || null,
        brand: "",
        code: "",
        size: ["7", "8", "9", "10"],
        description: "",
        status: row.status || "pending",
        rejectionReason: ""
    };
}

async function testConnection() {
    let connection;
    try {
        connection = await db.getConnection();
        console.log("Database Connected: shoe_inventory_db");
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
        console.error("Check XAMPP MySQL and DB_* settings.");
    } finally {
        if (connection) connection.release();
    }
}

// GET - Read all products from the existing products table.
app.get("/api/product", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM products ORDER BY product_id DESC"
        );
        res.status(200).json(rows.map(toProduct));
    } catch (error) {
        console.error("[GET /api/product]", error);
        res.status(500).json({ message: "Failed to fetch products.", error: error.message });
    }
});

// POST - Add a product.
app.post("/api/product", async (req, res) => {
    try {
        const productName = String(req.body.product || req.body.product_name || "").trim();
        if (!productName) {
            return res.status(400).json({ message: "Product name is required." });
        }

        const [result] = await db.execute(
            `INSERT INTO products
                (seller_id, product_name, buy_price, sell_price, stock, image, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.body.sellerId || req.body.seller_id || null,
                productName,
                Number(req.body.buy ?? req.body.buy_price) || 0,
                Number(req.body.sell ?? req.body.sell_price) || 0,
                Math.max(0, Number(req.body.stock) || 0),
                req.body.image || "",
                req.body.status || "pending"
            ]
        );

        const [rows] = await db.execute(
            "SELECT * FROM products WHERE product_id = ?",
            [result.insertId]
        );
        res.status(201).json(toProduct(rows[0]));
    } catch (error) {
        console.error("[POST /api/product]", error);
        res.status(500).json({ message: "Failed to add product.", error: error.message });
    }
});

// PUT - Update an existing product.
app.put("/api/product/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid product ID." });
        }

        const productName = String(req.body.product || req.body.product_name || "").trim();
        if (!productName) {
            return res.status(400).json({ message: "Product name is required." });
        }

        const [result] = await db.execute(
            `UPDATE products SET
                seller_id = ?, product_name = ?, buy_price = ?, sell_price = ?,
                stock = ?, image = ?, status = ?
             WHERE product_id = ?`,
            [
                req.body.sellerId || req.body.seller_id || null,
                productName,
                Number(req.body.buy ?? req.body.buy_price) || 0,
                Number(req.body.sell ?? req.body.sell_price) || 0,
                Math.max(0, Number(req.body.stock) || 0),
                req.body.image || "",
                req.body.status || "pending",
                id
            ]
        );

        const [rows] = await db.execute(
            "SELECT * FROM products WHERE product_id = ?",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.status(200).json(toProduct(rows[0]));
    } catch (error) {
        console.error("[PUT /api/product/:id]", error);
        res.status(500).json({ message: "Failed to update product.", error: error.message });
    }
});

// DELETE - Remove one product.
app.delete("/api/product/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid product ID." });
        }

        const [result] = await db.execute(
            "DELETE FROM products WHERE product_id = ?",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.status(200).json({ message: "Product deleted successfully." });
    } catch (error) {
        console.error("[DELETE /api/product/:id]", error);
        res.status(500).json({ message: "Failed to delete product.", error: error.message });
    }
});

app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.status(200).json({ status: "ok", database: "connected", name: "shoe_inventory_db" });
    } catch (error) {
        res.status(503).json({ status: "error", database: "disconnected", error: error.message });
    }
});

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await testConnection();
});
