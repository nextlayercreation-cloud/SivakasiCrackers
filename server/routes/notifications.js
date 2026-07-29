/**
 * server/routes/notifications.js
 * GET  /api/notifications/user/:userId        -> all notifications for a user
 * GET  /api/notifications/user/:userId/unread -> unread count for a user
 * POST /api/notifications/user/:userId/read   -> mark all as read for a user
 */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/user/:userId', async (req, res, next) => {
  try {
    res.json(await store.getNotificationsForUser(req.params.userId));
  } catch (err) {
    next(err);
  }
});

router.get('/user/:userId/unread', async (req, res, next) => {
  try {
    res.json({ count: await store.getUnreadCountForUser(req.params.userId) });
  } catch (err) {
    next(err);
  }
});

router.post('/user/:userId/read', async (req, res, next) => {
  try {
    await store.markAllNotificationsRead(req.params.userId);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
