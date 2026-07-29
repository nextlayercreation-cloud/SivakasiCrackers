/**
 * server/routes/products.js
 * GET    /api/products            -> list all products
 * POST   /api/products             -> add a new product (admin)
 * PUT    /api/products/:id         -> update a product (admin)
 * DELETE /api/products/:id         -> delete a product (admin)
 * POST   /api/products/:id/stock   -> add stock to a product (admin)
 */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getProducts());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, category, price, mrp, stock, desc, lowStockThreshold, image } = req.body;
    if (!name || !price || !mrp || stock === undefined) {
      return res.status(400).json({ message: 'name, price, mrp and stock are required' });
    }
    const product = await store.addProduct({ name, category, price, mrp, stock, desc, lowStockThreshold, image });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const updated = await store.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await store.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/stock', async (req, res, next) => {
  try {
    const { qty } = req.body;
    if (qty === undefined) return res.status(400).json({ message: 'qty is required' });
    const updated = await store.addStockToProduct(req.params.id, qty);
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
