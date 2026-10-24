const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());

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

let nextID = 5;

app.get("/api/product", (req, res) => {
    res.json(products);
});

app.post("/api/product", (req, res) => {
    const newProduct = {
        id: nextID,
        product: req.body.product,
        buy: req.body.buy,
        sell: req.body.sell,
        stock: req.body.stock,
        image: req.body.image || ""
    };

    nextID++;

    products.push(newProduct);

    console.log("\n[ADDED]", { ...newProduct, image: newProduct.image ? "(has image)" : "" });
    res.status(201).json(newProduct);
});

app.put("/api/product/:id", (req, res) => {
    const id = Number(req.params.id);

    const editID = products.findIndex(
        (item) => item.id === id
    );

    if (editID === -1) {
        return res.status(404).json({
            message: "Product not found"
        });
    }
   const oldProduct = products[editID];
    products[editID] = {
        id: id,
        product: req.body.product,
        buy: req.body.buy,
        sell: req.body.sell,
        stock: req.body.stock,
        image: req.body.image || ""

    };

    console.log("\n[UPDATED]", { ...products[editID], image: products[editID].image ? "(has image)" : "" });

    res.json(products[editID]);
});

app.delete("/api/product/:id", (req, res) => {
    const id = Number(req.params.id);

    const deleteID = products.findIndex(
        (item) => item.id === id
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

app.listen(8080, () => {
    console.log("Server running on port 8080");
});