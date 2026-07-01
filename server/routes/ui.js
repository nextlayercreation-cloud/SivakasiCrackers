const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/categories', async (req, res, next) => {
  try {
    res.json(await store.getExtraCategories());
  } catch (err) {
    next(err);
  }
});

router.put('/categories', async (req, res, next) => {
  try {
    const categories = Array.isArray(req.body.categories) ? req.body.categories : [];
    res.json(await store.setExtraCategories(categories));
  } catch (err) {
    next(err);
  }
});

router.get('/cart/:ownerId', async (req, res, next) => {
  try {
    res.json(await store.getCart(req.params.ownerId));
  } catch (err) {
    next(err);
  }
});

router.put('/cart/:ownerId', async (req, res, next) => {
  try {
    res.json(await store.saveCart(req.params.ownerId, req.body.items || {}));
  } catch (err) {
    next(err);
  }
});

router.delete('/cart/:ownerId', async (req, res, next) => {
  try {
    await store.clearCart(req.params.ownerId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;