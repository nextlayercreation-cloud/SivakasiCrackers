const express = require('express');
const router = express.Router();
const store = require('../data/store');
router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getIncomes());
  } catch (err) {
    next(err);
  }
});
router.post('/', async (req, res, next) => {
  try {
    const { title, amount, category, note, date } = req.body;
    if (!title || !amount) return res.status(400).json({ message: 'Title and amount required' });
    const inc = await store.addIncome({ title, amount: parseFloat(amount), category: category || 'Other', note: note || '', date: date || new Date().toISOString() });
    res.status(201).json(inc);
  } catch (err) {
    next(err);
  }
});
router.delete('/:id', async (req, res, next) => {
  try {
    await store.deleteIncome(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
