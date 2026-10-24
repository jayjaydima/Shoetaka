# Shoe Taka - Customer + Seller Frontend

This version extends the existing Shoe Taka marketplace into a **One Account, Two Modes** frontend.

## Customer Mode

- Store
- Customer Dashboard
- Cart
- Orders
- Notifications
- Customer Profile / Update Profile
- Sell Now button

## Seller Mode

- Seller Dashboard
- Add Product
- My Products
- Seller Orders
- Seller Notifications
- Seller Profile / Update Profile

## Order flow

Customer -> Cart -> Checkout -> Order -> Seller Notification -> Seller Orders -> Status Update -> Customer Notification.

## Temporary frontend storage

The new marketplace data uses `localStorage` so the frontend can run without Express.

The storage helper is:

`src/data/storage.js`

The main temporary-storage areas are:

- `src/context/ProductsContext.jsx`
- `src/context/CartContext.jsx`
- `src/context/UserContext.jsx`
- `src/pages/AddProduct.jsx`

Search for:

`TEMPORARY LOCAL STORAGE`

Those comments mark the places that should be replaced with your Express/server.js API calls later.

## Run

```bash
npm install
npm run dev
```

No new backend/server.js code is included in this update.
