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
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');

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
const ASSETS_ROOT = path.join(__dirname, 'assets');
const ALLOWED_IMAGE_TYPES = ['products', 'combos', 'giftboxes', 'offers', 'newarrivals'];

const uploadStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const requestedType = (req.body?.imageType || req.body?.type || 'products').toString().toLowerCase();
    const folderName = ALLOWED_IMAGE_TYPES.includes(requestedType) ? requestedType : 'products';
    const targetDir = path.join(ASSETS_ROOT, folderName);
    try {
      await fs.mkdir(targetDir, { recursive: true });
      cb(null, targetDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const baseName = (path.basename(file.originalname || 'image', extension) || 'image')
      .replace(/[^a-z0-9.-]+/gi, '-')
      .toLowerCase() || 'image';
    cb(null, `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/assets', express.static(ASSETS_ROOT));

// Simple request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sivakasi Crackers API is running' });
});

app.post('/api/upload', (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Image must be under 2MB' });
      }
      return res.status(400).json({ message: err.message || 'Image upload failed' });
    }

    try {
      const requestedType = (req.body?.imageType || req.body?.type || 'products').toString().toLowerCase();
      const folderName = ALLOWED_IMAGE_TYPES.includes(requestedType) ? requestedType : 'products';
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const filePath = path.join(ASSETS_ROOT, folderName, req.file.filename);
      await fs.access(filePath);
      res.json({ imageUrl: `/assets/${folderName}/${req.file.filename}` });
    } catch (error) {
      next(error);
    }
  });
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
  // console.log(`🎆 Sivakasi Crackers API running on http://https://sivakasicrackersapi.onrender.com`);
});
