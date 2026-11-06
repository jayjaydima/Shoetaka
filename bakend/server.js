const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Keep database credentials in environment variables.
// Defaults are suitable for a typical local XAMPP installation.
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "backend",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function normalizeSize(value) {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
            return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
    }
    return ["7", "8", "9", "10"];
}

function toProduct(row) {
    return {
        ...row,
        id: Number(row.id),
        buy: String(row.buy ?? "0"),
        sell: String(row.sell ?? "0"),
        stock: String(row.stock ?? "0"),
        image: row.image || "",
        brand: row.brand || "",
        code: row.code || "",
        size: normalizeSize(row.size),
        description: row.description || "",
        sellerId: row.sellerId || null,
        status: row.status || (row.sellerId ? "pending" : "approved"),
        rejectionReason: row.rejectionReason || ""
    };
}

async function testConnection() {
    let connection;
    try {
        connection = await db.getConnection();
        console.log("Database Connected Successfully!");
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
        console.error("Check that MySQL is running and your DB_* settings are correct.");
    } finally {
        if (connection) connection.release();
    }
}

// GET - Read all products
app.get("/api/product", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
        res.status(200).json(rows.map(toProduct));
    } catch (error) {
        console.error("[GET /api/product]", error);
        res.status(500).json({ message: "Failed to fetch products.", error: error.message });
    }
});

// POST - Add a product
app.post("/api/product", async (req, res) => {
    try {
        const {
            product, buy, sell, stock, image, brand, code,
            size, description, sellerId, status, rejectionReason
        } = req.body;

        const productName = String(product || "").trim();
        if (!productName) {
            return res.status(400).json({ message: "Product name is required." });
        }

        const [result] = await db.execute(
            `INSERT INTO products
                (product, buy, sell, stock, image, brand, code, size,
                 description, sellerId, status, rejectionReason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productName,
                Number(buy) || 0,
                Number(sell) || 0,
                Math.max(0, Number(stock) || 0),
                image || "",
                String(brand || "").trim().toUpperCase(),
                String(code || "").trim().toUpperCase(),
                JSON.stringify(normalizeSize(size)),
                description || "",
                sellerId || null,
                status || (sellerId ? "pending" : "approved"),
                rejectionReason || ""
            ]
        );

        const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [result.insertId]);
        console.log("[ADDED PRODUCT]", result.insertId);
        res.status(201).json(toProduct(rows[0]));
    } catch (error) {
        console.error("[POST /api/product]", error);
        res.status(500).json({ message: "Failed to add product.", error: error.message });
    }
});

// PUT - Update a product
app.put("/api/product/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid product ID." });
        }

        const {
            product, buy, sell, stock, image, brand, code,
            size, description, sellerId, status, rejectionReason
        } = req.body;

        const productName = String(product || "").trim();
        if (!productName) {
            return res.status(400).json({ message: "Product name is required." });
        }

        const [result] = await db.execute(
            `UPDATE products SET
                product = ?, buy = ?, sell = ?, stock = ?, image = ?,
                brand = ?, code = ?, size = ?, description = ?,
                sellerId = ?, status = ?, rejectionReason = ?
             WHERE id = ?`,
            [
                productName,
                Number(buy) || 0,
                Number(sell) || 0,
                Math.max(0, Number(stock) || 0),
                image || "",
                String(brand || "").trim().toUpperCase(),
                String(code || "").trim().toUpperCase(),
                JSON.stringify(normalizeSize(size)),
                description || "",
                sellerId || null,
                status || (sellerId ? "pending" : "approved"),
                rejectionReason || "",
                id
            ]
        );

        if (result.affectedRows === 0) {
            const [rows] = await db.execute("SELECT id FROM products WHERE id = ?", [id]);
            if (rows.length === 0) {
                return res.status(404).json({ message: "Product not found." });
            }
        }

        const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [id]);
        console.log("[UPDATED PRODUCT]", id);
        res.status(200).json(toProduct(rows[0]));
    } catch (error) {
        console.error("[PUT /api/product/:id]", error);
        res.status(500).json({ message: "Failed to update product.", error: error.message });
    }
});

// DELETE - Remove a product
app.delete("/api/product/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid product ID." });
        }

        const [result] = await db.execute("DELETE FROM products WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        console.log("[DELETED PRODUCT]", id);
        res.status(200).json({ message: "Product deleted successfully." });
    } catch (error) {
        console.error("[DELETE /api/product/:id]", error);
        res.status(500).json({ message: "Failed to delete product.", error: error.message });
    }
});

app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.status(200).json({ status: "ok", database: "connected" });
    } catch (error) {
        res.status(503).json({ status: "error", database: "disconnected", error: error.message });
    }
});

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await testConnection();
});
