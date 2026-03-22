# SCAN&GOO — Smart Shopping App

A complete full-stack smart supermarket self-scanning app built for Inzovu Supermarket, Rwanda.

## Project Structure

```
scangoo/
├── backend/
│   ├── config/
│   │   ├── db.js           ← MySQL pool
│   │   └── schema.sql      ← DB schema + seed data
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── sessionController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js         ← JWT verify + role guard
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── sessions.js
│   │   └── admin.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── frontend/
    └── SCANGOO_App_v2.html ← Complete connected frontend
```

## Quick Start

### 1. Database Setup
```bash
# Create DB and tables
mysql -u root -p < backend/config/schema.sql
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MySQL password and JWT secret

# Start server
node server.js
# or for dev with auto-reload:
npx nodemon server.js
```

### 3. Frontend Setup
```bash
cd frontend
npx serve .
# Open http://localhost:PORT/SCANGOO_App_v2.html
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | – | Login, returns JWT |
| POST | /api/auth/register | – | Register shopper |
| GET | /api/auth/me | JWT | Current user info |
| GET | /api/products | JWT | All products |
| GET | /api/products/barcode/:code | JWT | Lookup by barcode |
| POST | /api/products | Admin | Add product |
| POST | /api/sessions | JWT | Start session |
| GET | /api/sessions/my | JWT | Shopper history |
| GET | /api/sessions/:id | JWT | Session detail |
| PUT | /api/sessions/:id/items | JWT | Sync cart to DB |
| POST | /api/sessions/:id/checkout | JWT | Complete + pay |
| GET | /api/admin/dashboard | Admin | Live dashboard |
| GET | /api/admin/alerts | Admin | All alerts |
| PATCH | /api/admin/alerts/:id/resolve | Admin | Dismiss alert |
| GET | /api/admin/users | Admin | All users |
| GET | /api/admin/revenue | Admin | 7-day revenue |

---

## Demo Credentials

| Role | Phone | Password |
|------|-------|----------|
| Shopper | +250788123456 | password123 |
| Admin | +250788000000 | admin123 |

> **Note:** Both use the same hashed password `password123` in the seed.
> Change these in production!

---

## How Frontend ↔ Backend Works

```
[User taps product]
      ↓
scanProduct(id)
      ↓
  cart[] updated locally (instant UI)
      ↓
scheduleSyncCart() — debounced 600ms
      ↓
PUT /api/sessions/:id/items  →  MySQL session_items table
      ↓
Admin dashboard polls /api/admin/dashboard every 4s
      ↓
Live session card updates for admin
```

### Payment Flow
```
[Tap PAY NOW]
      ↓
syncCartToAPI() — final sync
      ↓
POST /api/sessions/:id/checkout
      ↓
Backend creates transaction record
      ↓
Session marked 'completed'
      ↓
New session auto-created for next shop
      ↓
Receipt screen shown with TXN ID + QR
```

---

## Production Checklist

- [ ] Change `JWT_SECRET` in `.env`
- [ ] Change demo user passwords in DB
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update CORS origins in `server.js` to your domain
- [ ] Update `const API = 'http://localhost:3000'` in HTML to production URL
- [ ] Use HTTPS in production
- [ ] Integrate real MTN MoMo / Airtel Money APIs in `sessionController.js`
- [ ] Set up proper barcode scanner (replace demo tap buttons)
