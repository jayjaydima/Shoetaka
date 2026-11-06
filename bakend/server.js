const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());

const PORT = process.env.PORT || 8080;

let products = [
    {
        id: 1,
        product: "A1 jordan",
        buy: "1800",
        sell: "3499",
        stock: "10",
        image: ""
    },
    {
        id: 2,
        product: "nike-melo",
        buy: "2200",
        sell: " 3799",
        stock: "6",
        image: ""
    },
    {
        id: 3,
        product: "puma-vintage",
        buy: "1700",
        sell: "3699",
        stock: "15",
        image: ""
    },
    {
        id: 4,
        product: "adidas-samba",
        buy: "2500",
        sell: "3599",
        stock: "20",
        image: ""
    }
];

let nextID = Math.max(0, ...products.map((item) => Number(item.id) || 0)) + 1;

app.get("/api/product", (req, res) => {
    res.json(products);
});

app.post("/api/product", (req, res) => {
    const newProduct = {
        ...req.body,
        id: nextID,
        product: String(req.body.product || "").trim(),
        buy: String(req.body.buy ?? "0"),
        sell: String(req.body.sell ?? "0").trim(),
        stock: String(req.body.stock ?? "0"),
        image: req.body.image || "",
        brand: String(req.body.brand || "").trim().toUpperCase(),
        code: String(req.body.code || "").trim().toUpperCase(),
        size: Array.isArray(req.body.size) ? req.body.size.map(String) : ["7", "8", "9", "10"],
        description: String(req.body.description || ""),
        sellerId: req.body.sellerId || null,
        status: req.body.status || (req.body.sellerId ? "pending" : "approved"),
        rejectionReason: req.body.rejectionReason || ""
    };

    nextID++;

    products.push(newProduct);

    console.log("\n[ADDED]", { ...newProduct, image: newProduct.image ? "(has image)" : "" });
    res.status(201).json(newProduct);
});

app.put("/api/product/:id", (req, res) => {
    const id = String(req.params.id);

    const editID = products.findIndex(
        (item) => String(item.id) === id
    );

    if (editID === -1) {
        return res.status(404).json({
            message: "Product not found"
        });
    }
    const oldProduct = products[editID];
    products[editID] = {
        ...oldProduct,
        ...req.body,
        id: oldProduct.id,
        product: String(req.body.product ?? oldProduct.product).trim(),
        buy: String(req.body.buy ?? oldProduct.buy),
        sell: String(req.body.sell ?? oldProduct.sell).trim(),
        stock: String(req.body.stock ?? oldProduct.stock),
        image: req.body.image ?? oldProduct.image ?? "",
        brand: String(req.body.brand ?? oldProduct.brand ?? "").trim().toUpperCase(),
        code: String(req.body.code ?? oldProduct.code ?? "").trim().toUpperCase(),
        size: Array.isArray(req.body.size) ? req.body.size.map(String) : oldProduct.size || ["7", "8", "9", "10"],
        description: String(req.body.description ?? oldProduct.description ?? ""),
        sellerId: req.body.sellerId ?? oldProduct.sellerId ?? null,
        status: req.body.status ?? oldProduct.status ?? "approved",
        rejectionReason: req.body.rejectionReason ?? oldProduct.rejectionReason ?? ""
    };

    console.log("\n[UPDATED]", { ...products[editID], image: products[editID].image ? "(has image)" : "" });

    res.json(products[editID]);
});

app.delete("/api/product/:id", (req, res) => {
    const id = String(req.params.id);

    const deleteID = products.findIndex(
        (item) => String(item.id) === id
    );

    if (deleteID === -1) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    const deletedProduct = products[deleteID];

    products.splice(deleteID, 1);

    console.log("\n[DELETED]", { ...deletedProduct, image: deletedProduct.image ? "(has image)" : "" });
    res.json({
        message: "Product deleted successfully",
        product: deletedProduct
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});