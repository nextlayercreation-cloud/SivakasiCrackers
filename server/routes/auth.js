/**
 * server/routes/auth.js
 * POST /api/auth/register      -> register a new customer
 * POST /api/auth/login         -> customer login (phone + password)
 * POST /api/auth/admin-login   -> admin login (username + password)
 *
 * Admin and customer auth are intentionally separate endpoints,
 * matching the requirement that admin and user login never share
 * a form or a code path.
 */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.post('/register', async (req, res, next) => {
  try {
    const { fname, lname, phone, city, state, password } = req.body;
    if (!fname || !lname || !phone || !city || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const nameRegex = /^[A-Za-z\u0B80-\u0BFF\s]+$/;
    if (!nameRegex.test(fname.trim())) {
      return res.status(400).json({ message: 'First name must contain letters only, no numbers' });
    }
    if (!nameRegex.test(lname.trim())) {
      return res.status(400).json({ message: 'Last name must contain letters only, no numbers' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone must be a valid 10-digit number' });
    }
    const user = await store.registerUser({ fname, lname, phone, city, state, password, name: `${fname} ${lname}` });
    res.status(201).json({ ...user, role: 'user' });
  } catch (err) {
    if (err.code === 'USER_EXISTS') {
      return res.status(409).json({ message: 'User already exists' });
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }
    const user = await store.getUserByPhone(phone);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password !== password) return res.status(401).json({ message: 'Wrong password' });
    res.json({ ...user, role: 'user' });
  } catch (err) {
    next(err);
  }
});

router.post('/admin-login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!store.validateAdmin(email, password)) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    res.json({ id: 'admin', name: 'Admin', email, role: 'admin' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
