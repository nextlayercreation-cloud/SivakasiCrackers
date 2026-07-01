/**
 * server/routes/orders.js
 * GET   /api/orders                -> list all orders
 * POST  /api/orders                -> place a new order (reduces stock + sends "order placed" notification)
 * PUT   /api/orders/:id/status     -> update order status
 * POST  /api/orders/:id/ship       -> mark Shipped (sends "shipped" notification to the customer)
 */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getOrders());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { userId, userName, userPhone, items, subtotal, delivery, total, shippingAddress, paymentLast4 } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    const order = await store.addOrder({
      userId, userName, userPhone, items, subtotal, delivery, total, shippingAddress, paymentLast4,
    });

    await store.reduceStockForOrder(items);
    for (const item of items) {
      await store.reduceCollectionStock(item.productId, item.qty);
    }

    await store.addNotification(`Your order ${order.id} has been placed successfully!`, 'order', userId);

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });
    const updated = await store.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ message: 'Order not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * Mark an order as Shipped.
 * NOTE: stock is reduced at the time of order placement (POST /api/orders),
 * matching the existing frontend behavior. This endpoint only:
 *   1. Sets order status to "Shipped"
 *   2. Creates a notification for the customer (so the user
 *      dashboard bell + banner can pick it up)
 */
router.post('/:id/ship', async (req, res, next) => {
  try {
    const updated = await store.updateOrderStatus(req.params.id, 'Shipped');
    if (!updated) return res.status(404).json({ message: 'Order not found' });

    await store.addNotification(`Your order ${updated.id} has been shipped!`, 'shipping', updated.userId);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
