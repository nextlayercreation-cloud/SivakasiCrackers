/**
 * server/routes/bills.js
 * GET  /api/bills   -> list all bills
 * POST /api/bills   -> create a new bill
 */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getBills());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { items, subtotal, tax, taxPct, total, customerName, customerPhone } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ message: 'Bill must contain at least one item' });
    }
    const bill = await store.createBill({ items, subtotal, tax, taxPct, total, customerName, customerPhone });
    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
