const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

app.use(cors());
app.use(express.json({ limit: "5mb" }));

function readProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[PRODUCTS] Could not read saved products:", error.message);
    return [];
  }
}

let products = readProducts();

function saveProducts() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function validateProduct(body) {
  const priceValue = Number(body.priceValue);
  const stock = Number(body.stock);
  const sizes = Array.isArray(body.size) ? body.size.map(String).filter(Boolean) : [];

  if (!String(body.name || "").trim()) return "Product name is required.";
  if (!String(body.code || "").trim()) return "Product code is required.";
  if (!Number.isFinite(priceValue) || priceValue <= 0) return "A valid selling price is required.";
  if (!Number.isInteger(stock) || stock < 0) return "Stock must be a whole number greater than or equal to zero.";
  if (sizes.length === 0) return "At least one shoe size is required.";
  if (body.image && typeof body.image !== "string") return "Invalid product image.";
  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "shoe-taka-api" });
});

app.get("/api/product", (_req, res) => {
  res.json(products);
});

app.post("/api/product", (req, res) => {
  const validationError = validateProduct(req.body || {});
  if (validationError) return res.status(400).json({ message: validationError });

  const sellerId = req.body.sellerId ? String(req.body.sellerId) : null;
  const product = {
    id: `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(req.body.name).trim(),
    brand: String(req.body.brand || "").trim().toUpperCase(),
    code: String(req.body.code).trim().toUpperCase(),
    priceValue: Number(req.body.priceValue),
    stock: Number(req.body.stock),
    size: req.body.size.map(String).filter(Boolean),
    image: String(req.body.image || ""),
    description: String(req.body.description || "").trim(),
    condition: String(req.body.condition || "New"),
    sellerId,
    status: sellerId ? "pending" : "approved",
    rejectionReason: "",
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };

  products.push(product);
  try {
    saveProducts();
  } catch (error) {
    products = products.filter((item) => item.id !== product.id);
    console.error("[PRODUCTS] Could not save product:", error);
    return res.status(500).json({ message: "Could not save product on the server." });
  }

  console.log("[ADDED]", { ...product, image: product.image ? "(has image)" : "" });
  return res.status(201).json(product);
});

app.put("/api/product/:id", (req, res) => {
  const index = products.findIndex((item) => String(item.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Product not found." });

  const validationError = validateProduct(req.body || {});
  if (validationError) return res.status(400).json({ message: validationError });

  const current = products[index];
  products[index] = {
    ...current,
    name: String(req.body.name).trim(),
    brand: String(req.body.brand || "").trim().toUpperCase(),
    code: String(req.body.code).trim().toUpperCase(),
    priceValue: Number(req.body.priceValue),
    stock: Number(req.body.stock),
    size: req.body.size.map(String).filter(Boolean),
    image: String(req.body.image || ""),
    description: String(req.body.description || "").trim(),
    updatedAtMs: Date.now(),
  };

  try {
    saveProducts();
  } catch (error) {
    products[index] = current;
    return res.status(500).json({ message: "Could not update product on the server." });
  }
  return res.json(products[index]);
});

app.delete("/api/product/:id", (req, res) => {
  const index = products.findIndex((item) => String(item.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Product not found." });

  const [deleted] = products.splice(index, 1);
  try {
    saveProducts();
  } catch (error) {
    products.splice(index, 0, deleted);
    return res.status(500).json({ message: "Could not delete product on the server." });
  }
  return res.json({ message: "Product deleted successfully.", product: deleted });
});

app.listen(PORT, () => {
  console.log(`Shoe Taka API running at http://localhost:${PORT}`);
});
