# 🎆 Sivakasi Crackers — Full MERN-style App (React + Express)

A complete **frontend + middleware** rebuild: React (Create React App) talks to
a real **Express.js** backend over REST APIs via **axios**. All data lives in
**server-side memory** (no database, no localStorage for business data) —
this is the "M" in MERN swapped out for a plain in-memory JS store so the
project runs anywhere with just Node, no MongoDB install required.

```
sivakasi-crackers/
├── server/                  ← Express middleware (Node backend)
│   ├── index.js              Express app entrypoint (port 5000)
│   ├── data/
│   │   └── store.js          In-memory "database" (products, orders, bills, users, notifications)
│   └── routes/
│       ├── products.js       /api/products
│       ├── orders.js         /api/orders   (places orders, ships orders, reduces stock)
│       ├── bills.js          /api/bills
│       ├── auth.js           /api/auth     (separate user + admin login endpoints)
│       └── notifications.js  /api/notifications
│
├── src/                     ← React frontend (port 3000)
│   ├── api/                  axios-based API client (replaces old localStorage utils/storage.js)
│   │   ├── client.jsx          shared axios instance
│   │   ├── products.jsx
│   │   ├── orders.jsx
│   │   ├── bills.jsx
│   │   ├── auth.jsx
│   │   └── notifications.jsx
│   ├── pages/                 UserLoginPage.jsx, AdminLoginPage.jsx, UserDashboard.jsx, AdminDashboard.jsx, CheckoutPage.jsx, OrderSuccessPage.jsx
│   ├── middleware/auth.jsx    React route-guard helper (ProtectedRoute)
│   └── App.jsx                 Routing
│
└── public/
```

**File extension convention:** every React file under `src/` (components,
pages, the API client modules, even plain hook-free utility modules) uses
the `.jsx` extension. `server/` stays plain `.js` since it's Node/Express
with no JSX in it. This works out of the box with `react-scripts` (CRA's
webpack config already resolves `.jsx` automatically), so no extra config
was needed.

## Why "frontend + middleware"
- **Frontend** = the React app in `src/`.
- **Middleware** = the Express app in `server/`. It validates requests,
  applies business rules (e.g. "reduce stock when an order is placed",
  "create a notification when an order ships", "admin and user login are
  separate code paths"), and exposes everything as a REST API.
- There is **no database**. `server/data/store.js` holds everything in
  plain JS arrays/objects in memory. Restarting the server resets all data
  back to the seeded product catalog. To add a real database later, you
  only need to rewrite the functions inside `store.js` — the routes and the
  entire React frontend stay unchanged, since they only ever call those
  functions / hit those REST endpoints.

## Features
- **Fully separate login pages** — `/login` (customer) and `/admin-login`
  (admin) are different pages hitting different API endpoints
  (`POST /api/auth/login` vs `POST /api/auth/admin-login`). Admin
  credentials are checked **only on the server** — never shipped in the
  frontend bundle.
- **Online payment (simulated)** — card-based checkout form (name, number,
  expiry, CVV) with a simulated processing delay before the order is sent
  to the server.
- **Stock management** — stock is reduced server-side the moment an order
  is placed; Admin has a dedicated Stock Management tab to top up stock.
- **Shipped notifications** — clicking **🚚 Ship** in the Admin Orders tab
  calls a single API (`POST /api/orders/:id/ship`) that updates the order
  status **and** creates a notification for that customer in the same
  request. The customer's dashboard polls every 4 seconds and shows:
  - a 🔔 bell icon with an unread-count badge
  - a green "Order Shipped" banner at the top of the dashboard
- **Admin Dashboard** with 6 tabs: Dashboard stats, Orders, Stock
  Management, Billing (GST bill generator with print preview), Bill
  History, and Product CRUD.

## API Reference

| Method | Endpoint                          | Purpose                                  |
|--------|------------------------------------|-------------------------------------------|
| GET    | `/api/health`                      | Health check                              |
| GET    | `/api/products`                    | List products                             |
| POST   | `/api/products`                    | Add product (admin)                       |
| PUT    | `/api/products/:id`                | Update product (admin)                    |
| DELETE | `/api/products/:id`                | Delete product (admin)                    |
| POST   | `/api/products/:id/stock`          | Add stock to a product (admin)            |
| GET    | `/api/orders`                      | List orders                               |
| POST   | `/api/orders`                      | Place an order (reduces stock, notifies)  |
| PUT    | `/api/orders/:id/status`           | Update order status                       |
| POST   | `/api/orders/:id/ship`             | Mark order Shipped + notify customer      |
| GET    | `/api/bills`                       | List bills                                |
| POST   | `/api/bills`                       | Create a bill                             |
| POST   | `/api/auth/register`               | Customer registration                     |
| POST   | `/api/auth/login`                  | Customer login (phone + password)         |
| POST   | `/api/auth/admin-login`            | Admin login (username + password)         |
| GET    | `/api/notifications/user/:userId`  | All notifications for a user              |
| GET    | `/api/notifications/user/:userId/unread` | Unread count for a user             |
| POST   | `/api/notifications/user/:userId/read`   | Mark all notifications read         |

### Default Admin Login
- Username: `admin`
- Password: `admin123`

(Defined in `server/data/store.js` — change `ADMIN_CREDENTIALS` there.)

## How Stock Works
1. Products seed with initial stock in `server/data/store.js`.
2. `POST /api/orders` reduces stock immediately for every item ordered.
3. Admin's **Stock Management** tab shows live stock with low/out filters.
4. Admin can top up stock via `POST /api/products/:id/stock`.

## How Notifications Work
1. Customer places an order → server creates an "order placed" notification.
2. Admin clicks **🚚 Ship** on an order → `POST /api/orders/:id/ship` sets
   status to "Shipped" and creates a "shipped" notification, all in one
   request.
3. The customer dashboard polls `GET /api/notifications/user/:userId`
   every 4 seconds, updating the bell badge and shipped banner
   automatically — no page refresh needed.

## Run

You need **two processes**: the Express API and the React dev server.

```bash
npm install

# Option A — run both together
npm run dev

# Option B — run separately in two terminals
npm run server   # Express API on http://localhost:5000
npm start        # React app on http://localhost:3000
```

The React dev server proxies `/api/*` to `http://localhost:5000` (see the
`"proxy"` field in `package.json`), and `src/api/client.jsx` also points
directly at `http://localhost:5000/api` by default — so it works whether
or not the proxy is active. To point the frontend at a different backend
URL (e.g. in production), copy `.env.example` to `.env` and set
`REACT_APP_API_URL`.

## Production build
```bash
npm run build        # builds the React app into /build
npm run server:prod   # serve the Express API (point your static host at /build separately,
                       # or add express.static('build') to server/index.js for a single-process deploy)
```
