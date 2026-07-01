/**
 * server/index.js
 * ---------------------------------------------------------
 * Express middleware server for Sivakasi Crackers.
 *
 * Run with:  node server/index.js   (or  npm run server)
 * Listens on http://localhost:5000 by default.
 *
 * All data is held in memory (server/data/store.js) — it
 * resets whenever the server restarts. This is a frontend +
 * middleware project; swap server/data/store.js for a real
 * database layer (e.g. Mongoose models) to persist data.
 * ---------------------------------------------------------
 */
const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const billsRouter = require('./routes/bills');
const authRouter = require('./routes/auth');
const notificationsRouter = require('./routes/notifications');
const expensesRouter = require('./routes/expenses');
const incomesRouter = require('./routes/incomes');
const collectionsRouter = require('./routes/collections');
const uiRouter = require('./routes/ui');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Simple request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sivakasi Crackers API is running' });
});

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/bills', billsRouter);
app.use('/api/auth', authRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/incomes', incomesRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/ui', uiRouter);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎆 Sivakasi Crackers API running on http://localhost:${PORT}`);
});
