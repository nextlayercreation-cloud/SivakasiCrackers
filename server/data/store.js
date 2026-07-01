const { getFirebaseServices, saveDataUrlToAsset } = require('../firebase');

const ADMIN_CREDENTIALS = { email: 'admin@crackers.com', password: 'admin123' };

const initialProducts = [
  { id: '1', name: 'Sky Shot Rocket', category: 'Rockets', price: 150, mrp: 200, stock: 50, lowStockThreshold: 10, desc: '100 shots upward' },
  { id: '2', name: 'Color Fountain', category: 'Fountains', price: 120, mrp: 180, stock: 30, lowStockThreshold: 10, desc: 'Colorful sparkles' },
  { id: '3', name: 'Flower Pot', category: 'Flower Pots', price: 200, mrp: 250, stock: 20, lowStockThreshold: 5, desc: 'Beautiful multi-color' },
  { id: '4', name: 'Chakri', category: 'Wheels', price: 80, mrp: 120, stock: 100, lowStockThreshold: 20, desc: 'Spinning wheel' },
  { id: '5', name: 'Bomb', category: 'Bombettes', price: 50, mrp: 80, stock: 150, lowStockThreshold: 30, desc: 'Loud sound' },
  { id: '6', name: 'Atom Bomb', category: 'Bombettes', price: 30, mrp: 50, stock: 200, lowStockThreshold: 40, desc: 'Small loud cracker' },
  { id: '7', name: 'Ladi Bomb', category: 'Bombettes', price: 100, mrp: 150, stock: 75, lowStockThreshold: 15, desc: 'String of crackers' },
  { id: '8', name: 'Fancy Rocket', category: 'Rockets', price: 250, mrp: 350, stock: 25, lowStockThreshold: 8, desc: 'Premium 200 shots' },
  { id: '9', name: 'Ground Spinner', category: 'Wheels', price: 60, mrp: 90, stock: 80, lowStockThreshold: 15, desc: 'Spinning ground effect' },
  { id: '10', name: 'Star Bomb', category: 'Bombettes', price: 40, mrp: 65, stock: 120, lowStockThreshold: 25, desc: 'Star burst effect' },
  { id: '11', name: 'Roman Candle', category: 'Fountains', price: 180, mrp: 240, stock: 40, lowStockThreshold: 10, desc: '10-shot candle' },
  { id: '12', name: 'Mega Fountain', category: 'Fountains', price: 350, mrp: 450, stock: 15, lowStockThreshold: 5, desc: 'Premium fountain 3 mins' },
];

const initialCollections = {
  giftbox: [
    { id: 'col_1', name: 'Diwali Family Gift Box', desc: 'Assorted crackers for the whole family — rockets, fountains, flower pots & more', price: 999, mrp: 1299, discount: 23, stock: 40, lowStockThreshold: 10, image: '', createdAt: new Date().toISOString() },
    { id: 'col_2', name: 'Premium Celebration Box', desc: 'Our top-selling premium crackers in a gift-ready box', price: 1799, mrp: 2299, stock: 25, image: '', createdAt: new Date().toISOString() },
    { id: 'col_3', name: 'Kids Special Gift Box', desc: 'Safe sparklers and low-noise crackers for children', price: 599, mrp: 799, stock: 50, image: '', createdAt: new Date().toISOString() },
  ],
  combo: [
    { id: 'col_4', name: 'Starter Combo Pack', desc: 'Sparklers + Fountains + Wheels — perfect mini combo', price: 499, mrp: 650, stock: 60, image: '', createdAt: new Date().toISOString() },
    { id: 'col_5', name: 'Family Combo Pack', desc: 'Rockets, Bombettes, Fountains, Flower Pots — everything for the family', price: 1499, mrp: 1899, stock: 30, image: '', createdAt: new Date().toISOString() },
    { id: 'col_6', name: 'Mega Value Combo', desc: 'Our biggest combo — 12 varieties of crackers', price: 2499, mrp: 3199, stock: 18, image: '', createdAt: new Date().toISOString() },
  ],
  new_arrivals: [
    { id: 'col_7', name: 'Galaxy Glitter Rocket', desc: 'New! Multi-stage rocket with glitter trail effect', price: 280, mrp: 350, stock: 45, image: '', createdAt: new Date().toISOString() },
    { id: 'col_8', name: 'Rainbow Fountain Deluxe', desc: 'New! 7-color rainbow fountain, 90 seconds burn time', price: 220, mrp: 280, stock: 35, image: '', createdAt: new Date().toISOString() },
    { id: 'col_9', name: 'Twin Whistle Chakri', desc: 'New! Dual-tone whistling ground spinner', price: 90, mrp: 130, stock: 70, image: '', createdAt: new Date().toISOString() },
  ],
  offers: [
    { id: 'col_10', name: 'Mega Sparkler Bundle', desc: 'Buy 2 Get 1 Free — limited stock!', price: 150, mrp: 270, stock: 60, image: '', createdAt: new Date().toISOString() },
    { id: 'col_11', name: 'Premium Sky Shot', desc: 'Diwali special pricing', price: 199, mrp: 350, stock: 25, image: '', createdAt: new Date().toISOString() },
    { id: 'col_12', name: 'Bulk Flower Pots (10pcs)', desc: 'Best bulk deal', price: 999, mrp: 1500, stock: 12, image: '', createdAt: new Date().toISOString() },
    { id: 'col_13', name: 'Combo Clearance Pack', desc: 'End of season special', price: 599, mrp: 1000, stock: 8, image: '', createdAt: new Date().toISOString() },
  ],
};

const VALID_COLLECTION_TYPES = ['giftbox', 'combo', 'new_arrivals', 'offers'];

let readyPromise;

function nowIso() {
  return new Date().toISOString();
}

function sortByCreatedAtDesc(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function parseNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const services = await getFirebaseServices();
      await seedInitialData(services);
      return services;
    })().catch((err) => {
      readyPromise = undefined;
      throw err;
    });
  }

  return readyPromise;
}

async function seedInitialData(services) {
  const { db, firestore } = services;
  const { collection, doc, getDocs, setDoc } = firestore;

  const productSnap = await getDocs(collection(db, 'products'));
  if (productSnap.empty) {
    for (const product of initialProducts) {
      await setDoc(doc(db, 'products', String(product.id)), {
        ...product,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    console.log('[firebase] Seeded starter products');
  }

  const collectionSnap = await getDocs(collection(db, 'collections'));
  if (collectionSnap.empty) {
    for (const [type, items] of Object.entries(initialCollections)) {
      await setDoc(doc(db, 'collections', type), {
        id: type,
        items,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    console.log('[firebase] Seeded starter collections');
  }

  const uiStateSnap = await getDocs(collection(db, 'uiState'));
  if (uiStateSnap.empty) {
    await setDoc(doc(db, 'uiState', 'app'), {
      id: 'app',
      extraCategories: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

async function readAllDocuments(collectionName) {
  const services = await ensureReady();
  const { db, firestore } = services;
  const { collection, getDocs } = firestore;
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() })).sort(sortByCreatedAtDesc);
}

async function getDocument(collectionName, id) {
  const services = await ensureReady();
  const { db, firestore } = services;
  const { doc, getDoc } = firestore;
  const snap = await getDoc(doc(db, collectionName, String(id)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function setDocument(collectionName, id, data) {
  const services = await ensureReady();
  const { db, firestore } = services;
  const { doc, setDoc } = firestore;
  const next = { ...data, id: String(id), updatedAt: nowIso() };
  await setDoc(doc(db, collectionName, String(id)), next);
  return next;
}

async function deleteDocument(collectionName, id) {
  const services = await ensureReady();
  const { db, firestore } = services;
  const { doc, deleteDoc } = firestore;
  await deleteDoc(doc(db, collectionName, String(id)));
}

async function updateDocument(collectionName, id, patch) {
  const current = await getDocument(collectionName, id);
  if (!current) return null;
  const next = { ...current, ...patch, id: String(id), updatedAt: nowIso() };
  await setDocument(collectionName, id, next);
  return next;
}

async function readUiState() {
  const state = await getDocument('uiState', 'app');
  return state || { id: 'app', extraCategories: [] };
}

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
async function getProducts() {
  return readAllDocuments('products');
}

async function addProduct(data) {
  const id = String(Date.now());
  const image = await saveDataUrlToAsset(data.image, 'products', 'product');
  const product = {
    id,
    name: data.name,
    category: data.category || 'Rockets',
    price: parseNumber(data.price),
    mrp: parseNumber(data.mrp),
    stock: parseInt(data.stock, 10) || 0,
    lowStockThreshold: data.lowStockThreshold !== undefined && data.lowStockThreshold !== '' ? parseInt(data.lowStockThreshold, 10) : 10,
    desc: data.desc || '',
    image,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await setDocument('products', id, product);
  return product;
}

async function updateProduct(id, data) {
  const current = await getDocument('products', id);
  if (!current) return null;
  const image = data.image ? await saveDataUrlToAsset(data.image, 'products', 'product') : current.image || '';
  const updated = {
    ...current,
    ...data,
    id: String(id),
    name: data.name ?? current.name,
    category: data.category ?? current.category,
    price: data.price !== undefined ? parseNumber(data.price) : current.price,
    mrp: data.mrp !== undefined ? parseNumber(data.mrp) : current.mrp,
    stock: data.stock !== undefined ? (parseInt(data.stock, 10) || 0) : current.stock,
    lowStockThreshold: data.lowStockThreshold !== undefined && data.lowStockThreshold !== '' ? parseInt(data.lowStockThreshold, 10) : (current.lowStockThreshold ?? 10),
    desc: data.desc ?? current.desc ?? '',
    image,
    updatedAt: nowIso(),
  };
  await setDocument('products', id, updated);
  return updated;
}

async function deleteProduct(id) {
  await deleteDocument('products', id);
}

async function reduceStockForOrder(items) {
  for (const item of items || []) {
    const current = await getDocument('products', item.productId);
    if (!current) continue;
    const stock = Math.max(0, parseNumber(current.stock) - parseNumber(item.qty));
    await updateDocument('products', current.id, { stock });
  }
}

async function addStockToProduct(productId, qty) {
  const current = await getDocument('products', productId);
  if (!current) return null;
  const nextStock = parseNumber(current.stock) + parseNumber(qty);
  return updateDocument('products', productId, { stock: nextStock });
}

// ─── ORDERS ─────────────────────────────────────────────────────────────────
async function getOrders() {
  return readAllDocuments('orders');
}

async function addOrder(data) {
  const id = 'ORD-' + Date.now();
  const order = {
    ...data,
    id,
    createdAt: nowIso(),
    status: 'Pending',
  };
  await setDocument('orders', id, order);
  return order;
}

async function updateOrderStatus(orderId, status) {
  const current = await getDocument('orders', orderId);
  if (!current) return null;
  return updateDocument('orders', orderId, { status, updatedAt: nowIso() });
}

// ─── BILLING ────────────────────────────────────────────────────────────────
async function getBills() {
  return readAllDocuments('bills');
}

async function createBill(data) {
  const id = 'BILL-' + Date.now();
  const bill = {
    id,
    ...data,
    createdAt: nowIso(),
    status: 'Paid',
  };
  await setDocument('bills', id, bill);
  return bill;
}

// ─── USERS ──────────────────────────────────────────────────────────────────
async function getUsers() {
  return readAllDocuments('users');
}

async function registerUser(data) {
  const users = await getUsers();
  if (users.find((user) => user.phone === data.phone)) {
    const err = new Error('User already exists');
    err.code = 'USER_EXISTS';
    throw err;
  }
  const id = String(Date.now());
  const user = { id, ...data, role: 'user', createdAt: nowIso(), updatedAt: nowIso() };
  await setDocument('users', id, user);
  return user;
}

async function getUserByPhone(phone) {
  const users = await getUsers();
  return users.find((user) => user.phone === phone) || null;
}

function validateAdmin(email, password) {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password;
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
async function getNotifications() {
  return readAllDocuments('notifications');
}

async function addNotification(message, type = 'order', userId = null) {
  const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
  const notification = {
    id,
    message,
    type,
    userId,
    read: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await setDocument('notifications', id, notification);
  return notification;
}

async function getNotificationsForUser(userId) {
  const notifications = await getNotifications();
  return notifications.filter((notification) => String(notification.userId) === String(userId));
}

async function getUnreadCountForUser(userId) {
  const notifications = await getNotificationsForUser(userId);
  return notifications.filter((notification) => !notification.read).length;
}

async function markAllNotificationsRead(userId) {
  const notifications = await getNotificationsForUser(userId);
  await Promise.all(
    notifications.map((notification) => updateDocument('notifications', notification.id, { read: true }))
  );
}

// ─── EXPENSES ───────────────────────────────────────────────────────────────
async function getExpenses() {
  return readAllDocuments('expenses');
}

async function addExpense(data) {
  const id = String(Date.now());
  const expense = {
    id,
    title: data.title,
    amount: parseNumber(data.amount),
    category: data.category || 'Other',
    note: data.note || '',
    date: data.date || nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await setDocument('expenses', id, expense);
  return expense;
}

async function deleteExpense(id) {
  await deleteDocument('expenses', id);
}

// ─── INCOMES ────────────────────────────────────────────────────────────────
async function getIncomes() {
  return readAllDocuments('incomes');
}

async function addIncome(data) {
  const id = String(Date.now());
  const income = {
    id,
    title: data.title,
    amount: parseNumber(data.amount),
    category: data.category || 'Other',
    note: data.note || '',
    date: data.date || nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await setDocument('incomes', id, income);
  return income;
}

async function deleteIncome(id) {
  await deleteDocument('incomes', id);
}

// ─── COLLECTIONS ────────────────────────────────────────────────────────────
async function getCollection(type) {
  if (!VALID_COLLECTION_TYPES.includes(type)) return null;
  const current = await getDocument('collections', type);
  return current?.items || [];
}

async function writeCollection(type, items) {
  if (!VALID_COLLECTION_TYPES.includes(type)) return null;
  const current = await getDocument('collections', type);
  const payload = {
    id: type,
    items,
    createdAt: current?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  await setDocument('collections', type, payload);
  return items;
}

async function addToCollection(type, item) {
  if (!VALID_COLLECTION_TYPES.includes(type)) return null;
  const list = await getCollection(type);
  const folder = type === 'new_arrivals' ? 'newarrivals' : type === 'offers' ? 'offers' : 'combos';
  const id = `col_${Date.now()}`;
  const image = await saveDataUrlToAsset(item.image, folder, type === 'new_arrivals' ? 'newarrival' : type === 'offers' ? 'offer' : 'combo');
  const discount = item.mrp && item.price ? Math.round(((parseNumber(item.mrp) - parseNumber(item.price)) / parseNumber(item.mrp)) * 100) : parseNumber(item.discount, 0);
  const record = {
    id,
    name: item.name,
    desc: item.desc || '',
    price: parseNumber(item.price),
    mrp: parseNumber(item.mrp || item.price),
    discount,
    stock: parseInt(item.stock, 10) || 0,
    lowStockThreshold: item.lowStockThreshold !== undefined && item.lowStockThreshold !== '' ? parseInt(item.lowStockThreshold, 10) : 10,
    image,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await writeCollection(type, [record, ...list]);
  return record;
}

async function updateInCollection(type, id, item) {
  if (!VALID_COLLECTION_TYPES.includes(type)) return null;
  const list = await getCollection(type);
  const idx = list.findIndex((entry) => String(entry.id) === String(id));
  if (idx === -1) return null;
  const folder = type === 'new_arrivals' ? 'newarrivals' : type === 'offers' ? 'offers' : 'combos';
  const current = list[idx];
  const image = item.image ? await saveDataUrlToAsset(item.image, folder, type === 'new_arrivals' ? 'newarrival' : type === 'offers' ? 'offer' : 'combo') : current.image || '';
  const mrp = parseNumber(item.mrp || current.mrp || item.price || current.price);
  const price = item.mrp && item.discount
    ? mrp * (1 - parseNumber(item.discount) / 100)
    : parseNumber(item.price !== undefined ? item.price : current.price);
  const record = {
    ...current,
    name: item.name ?? current.name,
    desc: item.desc ?? current.desc,
    price: parseFloat(price.toFixed(2)),
    mrp,
    discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
    stock: item.stock !== undefined ? (parseInt(item.stock, 10) || 0) : current.stock,
    lowStockThreshold: item.lowStockThreshold !== undefined && item.lowStockThreshold !== '' ? parseInt(item.lowStockThreshold, 10) : (current.lowStockThreshold ?? 10),
    image,
    updatedAt: nowIso(),
  };
  list[idx] = record;
  await writeCollection(type, list);
  return record;
}

async function deleteFromCollection(type, id) {
  if (!VALID_COLLECTION_TYPES.includes(type)) return null;
  const list = await getCollection(type);
  const next = list.filter((entry) => String(entry.id) !== String(id));
  await writeCollection(type, next);
}

async function reduceCollectionStock(itemId, qty) {
  for (const type of VALID_COLLECTION_TYPES) {
    const list = await getCollection(type);
    const idx = list.findIndex((entry) => String(entry.id) === String(itemId));
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        stock: Math.max(0, parseNumber(list[idx].stock) - parseNumber(qty)),
        updatedAt: nowIso(),
      };
      await writeCollection(type, list);
      return true;
    }
  }
  return false;
}

// ─── APP STATE ─────────────────────────────────────────────────────────────
async function getExtraCategories() {
  const state = await readUiState();
  return state.extraCategories || [];
}

async function setExtraCategories(categories) {
  const services = await ensureReady();
  const { db, firestore } = services;
  const { doc, setDoc } = firestore;
  await setDoc(doc(db, 'uiState', 'app'), {
    id: 'app',
    extraCategories: Array.isArray(categories) ? categories : [],
    createdAt: (await readUiState()).createdAt || nowIso(),
    updatedAt: nowIso(),
  });
  return Array.isArray(categories) ? categories : [];
}

async function getCart(ownerId) {
  const cart = await getDocument('carts', ownerId);
  return cart?.items || {};
}

async function saveCart(ownerId, items) {
  const services = await ensureReady();
  const { db, firestore } = services;
  const { doc, setDoc } = firestore;
  const payload = {
    id: String(ownerId),
    items: items || {},
    createdAt: (await getDocument('carts', ownerId))?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  await setDoc(doc(db, 'carts', String(ownerId)), payload);
  return items || {};
}

async function clearCart(ownerId) {
  await deleteDocument('carts', ownerId);
}

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  reduceStockForOrder,
  addStockToProduct,
  getOrders,
  addOrder,
  updateOrderStatus,
  getBills,
  createBill,
  getUsers,
  registerUser,
  getUserByPhone,
  validateAdmin,
  getNotifications,
  addNotification,
  getNotificationsForUser,
  getUnreadCountForUser,
  markAllNotificationsRead,
  getExpenses,
  addExpense,
  deleteExpense,
  getIncomes,
  addIncome,
  deleteIncome,
  getCollection,
  addToCollection,
  updateInCollection,
  deleteFromCollection,
  reduceCollectionStock,
  getExtraCategories,
  setExtraCategories,
  getCart,
  saveCart,
  clearCart,
};