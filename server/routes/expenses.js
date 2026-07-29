/**
 * server/routes/expenses.js
 * GET  /api/expenses      -> list all expenses
 * POST /api/expenses      -> add a new expense entry
 * DELETE /api/expenses/:id -> remove an expense
 */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getExpenses());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, amount, category, note, date } = req.body;
    if (!title || !amount) return res.status(400).json({ message: 'Title and amount are required' });
    if (isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ message: 'Amount must be a positive number' });
    const exp = await store.addExpense({ title, amount: parseFloat(amount), category: category || 'Other', note: note || '', date: date || new Date().toISOString() });
    res.status(201).json(exp);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await store.deleteExpense(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
