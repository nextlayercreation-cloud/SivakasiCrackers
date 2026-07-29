# Quick Start Guide

## Prerequisites
- Node.js 16+ installed

## Steps
```bash
# 1. Extract the zip
unzip sivakasi-crackers-mern.zip
cd sivakasi-crackers

# 2. Install dependencies (installs both React and Express deps)
npm install

# 3. Run frontend + backend together
npm run dev
# React app:  http://localhost:3000
# Express API: http://localhost:5000
```

If `npm run dev` doesn't work on your machine, run the two parts in
separate terminals instead:
```bash
# Terminal 1
npm run server     # Express API on :5000

# Terminal 2
npm start           # React app on :3000
```

⚠️ The React app will not work correctly unless the Express server
(`npm run server`) is also running — it's a separate backend process,
not bundled into the React build.

## Login Details
| Role  | Where           | Username / Phone | Password    |
|-------|-----------------|-------------------|-------------|
| Admin | `/admin-login`  | admin             | admin123    |
| User  | `/login`        | Register first    | your choice |

Admin and customer logins are **two separate pages** — there's no role
toggle. The customer login page has a small "Staff / Admin login" link
at the bottom that takes you to `/admin-login`.

## Flow
1. Go to http://localhost:3000 → redirects to `/login` (customer login)
2. **New customer:** click "Register here" → fill in details → auto
   logged in → lands on the product dashboard
3. **Shop:** browse products, add to cart, go to Checkout, fill shipping
   + simulated card payment → Place Order
4. **Admin:** open `/admin-login` directly (or the footer link) → log in
   with `admin` / `admin123`
5. In the Admin dashboard, open the **Orders** tab and click **🚚 Ship**
   on a pending order
6. Switch back to the customer's browser tab (or log in as that customer)
   — within a few seconds the 🔔 bell badge and a green "Order Shipped"
   banner appear automatically (the dashboard polls the API every 4s)

## Resetting data
All data lives in server memory (`server/data/store.js`). Stopping and
restarting `npm run server` wipes orders/users/bills and resets products
back to the seeded catalog.
