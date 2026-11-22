# Shoe-Taka deployment: TiDB Cloud + Render + Netlify

## Render (Express API)

Create a **Web Service** from this repository.

- Root Directory: `bakend`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Set these Environment Variables in Render:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_MODE` | `tidb` |
| `TIDB_HOST` | TiDB Cloud endpoint hostname only (no protocol or port) |
| `TIDB_PORT` | `4000` |
| `TIDB_USER` | TiDB database username |
| `TIDB_PASSWORD` | TiDB database password |
| `TIDB_DATABASE` | `shoe_inventory_db` |
| `CORS_ORIGIN` | Exact Netlify site origin, e.g. `https://your-site.netlify.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Entire Firebase Admin service-account JSON, stored as a secret |

Do not add quotes around ordinary values. Paste the service-account JSON as one-line JSON. Never commit the private key or `.env`.

## Netlify (Vite + React)

Create a site from the same repository.

- Base directory: `Shoe-Taka-React`
- Build command: `npm run build`
- Publish directory: `dist`

Set this Netlify Environment Variable:

| Key | Value |
| --- | --- |
| `VITE_API_URL` | Render service origin, e.g. `https://your-api.onrender.com` |

After setting/changing this variable, trigger a new deploy so Vite embeds it in the frontend build.

## Database

The API intentionally continues to use the existing table names:
`users`, `products`, `addresses`, `orders`, `order_items`, `notifications`, and `payments`.

Do not rename tables to the temporary `_new` names until a verified TiDB migration has been run. The `_new` tables are not queried by this API.

Before enabling production traffic, confirm the original TiDB tables have the intended AUTO_INCREMENT primary keys and compatible order foreign-key column types. Keep a TiDB backup/export before schema changes.

## Health check

After deployment, open:

`https://your-api.onrender.com/health`

Expected response:

```json
{"status":"ok","database":"connected"}
```
