/**
 * Collections: giftbox | combo | new_arrivals
 * Each collection stores a list of product-like items (with name, price, mrp, desc, image, stock)
 */
const express = require('express');
const router  = express.Router();
const store = require('../data/store');

router.get('/:type', async (req, res, next) => {
  try {
    const list = await store.getCollection(req.params.type);
    if (!list) return res.status(400).json({ message: 'Unknown collection' });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/:type', async (req, res, next) => {
  try {
    const { name, desc, price, mrp, stock, image, discount, lowStockThreshold } = req.body;
    if (!name || !price || !stock) return res.status(400).json({ message: 'name, price, stock required' });
    const item = await store.addToCollection(req.params.type, { name, desc, price, mrp, stock, image, discount, lowStockThreshold });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:type/:id', async (req, res, next) => {
  try {
    const item = await store.updateInCollection(req.params.type, req.params.id, req.body);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:type/:id', async (req, res, next) => {
  try {
    await store.deleteFromCollection(req.params.type, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
