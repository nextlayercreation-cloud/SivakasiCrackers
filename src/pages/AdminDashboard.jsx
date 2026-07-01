import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, shipOrder } from '../api/orders';
import { getProducts, addProduct, updateProduct, deleteProduct, addStockToProduct } from '../api/products';
import { getBills, createBill } from '../api/bills';
import { getExpenses, addExpense, deleteExpense } from '../api/expenses';
import { getIncomes, addIncome as addIncomeAPI, deleteIncome } from '../api/incomes';
import { getCollection, addToCollection, updateInCollection, deleteFromCollection } from '../api/collections';
import { getExtraCategories, saveExtraCategories } from '../api/ui';
import SelectableSearch from '../components/SelectableSearch';

// ──────────────────────────────────────────────────────────────────────────────
// SIDEBAR TABS
// ──────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', icon: 'ti-dashboard',      label: 'Dashboard' },
  { id: 'orders',    icon: 'ti-package',         label: 'Orders' },
  { id: 'stock',     icon: 'ti-boxes',           label: 'Stock Management' },
  { id: 'billing',   icon: 'ti-file-invoice',    label: 'Billing' },
  { id: 'bills',     icon: 'ti-receipt',         label: 'Bill History' },
  { id: 'expenses',  icon: 'ti-cash',            label: 'Expenses' },
  { id: 'income',    icon: 'ti-trending-up',     label: 'Income History' },
  { id: 'collections', icon: 'ti-gift',            label: 'Collections' },
  { id: 'offers',    icon: 'ti-tag',             label: 'Manage Offers' },
  { id: 'products',  icon: 'ti-tools',           label: 'Manage Products' },
];

// ──────────────────────────────────────────────────────────────────────────────
// PRODUCT MODAL
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = ['Rockets','Fountains','Flower Pots','Wheels','Bombettes'];

function ProductModal({ product, onClose, onSave, showToast, customCategories, onAddCategory }) {
  const initDiscount = product && product.mrp > 0
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : '';
  const [form, setForm] = useState(
    product
      ? { ...product, lowStockThreshold: product.lowStockThreshold ?? 10 }
      : { name: '', category: 'Rockets', price: '', mrp: '', stock: '', lowStockThreshold: '10', desc: '', image: '' }
  );
  const [discount, setDiscount] = useState(String(initDiscount));
  const [customCats, setCustomCats] = useState(customCategories || []);
  const [newCat, setNewCat] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const allCategories = [...DEFAULT_CATEGORIES, ...customCats];
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setCustomCats(customCategories || []);
  }, [customCategories]);

  // When MRP changes → recalculate sale price if discount is set
  const handleMrpChange = (val) => {
    set('mrp', val);
    const mrp = parseFloat(val);
    const disc = parseFloat(discount);
    if (!isNaN(mrp) && !isNaN(disc) && mrp > 0 && disc >= 0 && disc < 100) {
      const salePrice = (mrp - (mrp * disc / 100)).toFixed(2);
      set('price', salePrice);
    }
  };

  // When Discount changes → recalculate sale price
  const handleDiscountChange = (val) => {
    setDiscount(val);
    const mrp = parseFloat(form.mrp);
    const disc = parseFloat(val);
    if (!isNaN(mrp) && !isNaN(disc) && mrp > 0 && disc >= 0 && disc < 100) {
      const salePrice = (mrp - (mrp * disc / 100)).toFixed(2);
      set('price', salePrice);
    }
  };

  // When Sale Price changes manually → recalculate discount
  const handlePriceChange = (val) => {
    set('price', val);
    const mrp = parseFloat(form.mrp);
    const price = parseFloat(val);
    if (!isNaN(mrp) && !isNaN(price) && mrp > 0) {
      const disc = Math.round(((mrp - price) / mrp) * 100);
      setDiscount(disc >= 0 ? String(disc) : '0');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => set('image', ev.target.result);
    reader.readAsDataURL(file);
  };

  const addCustomCategory = () => {
    const cat = newCat.trim();
    if (!cat) return;
    if (allCategories.map(c=>c.toLowerCase()).includes(cat.toLowerCase())) { showToast('Category already exists'); return; }
    const updated = [...customCats, cat];
    setCustomCats(updated);
    onAddCategory?.(updated);
    set('category', cat);
    setNewCat('');
    setShowNewCat(false);
    showToast(`Category "${cat}" added!`);
  };

  const handleSave = () => {
    if (!form.name || !form.price || !form.mrp || !form.stock) { showToast('Fill all required fields'); return; }
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', color: 'var(--muted)', fontSize: 20, lineHeight: 1,
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fdeaea'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
          >✕</button>
        </div>
        <label>Product Name *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sky Shot Rocket" />
        <label>Category *</label>
        <div style={{ display:'flex', gap:8, alignItems:'flex-start', flexWrap:'wrap' }}>
          <select value={form.category} onChange={e => set('category', e.target.value)} style={{ flex:1, minWidth:140 }}>
            {allCategories.map(c => <option key={c}>{c}</option>)}
          </select>
          <button type="button"
            onClick={() => setShowNewCat(p => !p)}
            style={{ background:'var(--navy)', color:'var(--gold)', border:'1.5px solid var(--gold)', borderRadius:8, padding:'7px 13px', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}
          >+ New Category</button>
        </div>
        {showNewCat && (
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <input
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addCustomCategory()}
              placeholder="e.g. Sparklers"
              style={{ flex:1, padding:'7px 12px', border:'1px solid var(--gold)', borderRadius:8, fontSize:13 }}
              autoFocus
            />
            <button type="button" onClick={addCustomCategory}
              style={{ background:'var(--gold)', color:'#1a0a00', border:'none', borderRadius:8, padding:'7px 16px', fontWeight:800, cursor:'pointer', fontSize:13 }}>
              Add
            </button>
            <button type="button" onClick={() => { setShowNewCat(false); setNewCat(''); }}
              style={{ background:'transparent', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:13 }}>
              Cancel
            </button>
          </div>
        )}
        {/* ── MRP + Discount → Auto Sale Price ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:10 }}>
          <div>
            <label>MRP (₹) *</label>
            <input
              type="number" min={0}
              value={form.mrp}
              onChange={e => handleMrpChange(e.target.value)}
              placeholder="e.g. 200"
              style={{ width:'100%' }}
            />
          </div>
          <div>
            <label>Discount (%)</label>
            <div style={{ position:'relative' }}>
              <input
                type="number" min={0} max={99}
                value={discount}
                onChange={e => handleDiscountChange(e.target.value)}
                placeholder="e.g. 25"
                style={{ width:'100%', paddingRight:28 }}
              />
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--muted)', pointerEvents:'none' }}>%</span>
            </div>
          </div>
        </div>

        {/* Sale Price — auto-calculated, but also manually editable */}
        <div style={{ marginTop:10 }}>
          <label>
            Sale Price (₹) *
            {form.mrp && discount && (
              <span style={{ marginLeft:8, fontSize:11, color:'#16a34a', fontWeight:600 }}>
                Auto-calculated from MRP &amp; Discount
              </span>
            )}
          </label>
          <div style={{ position:'relative' }}>
            <input
              type="number" min={0}
              value={form.price}
              onChange={e => handlePriceChange(e.target.value)}
              placeholder="Auto-calculated or enter manually"
              style={{
                width:'100%',
                background: form.mrp && discount ? 'rgba(22,163,74,0.07)' : undefined,
                borderColor: form.mrp && discount ? '#16a34a' : undefined,
              }}
            />
            {form.mrp && form.price && parseFloat(form.mrp) > parseFloat(form.price) && (
              <span style={{
                position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                fontSize:11, fontWeight:700, color:'#16a34a', pointerEvents:'none'
              }}>
                {Math.round(((parseFloat(form.mrp) - parseFloat(form.price)) / parseFloat(form.mrp)) * 100)}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Live preview */}
        {form.mrp && form.price && (
          <div style={{
            background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border:'1px solid #86efac', borderRadius:10,
            padding:'10px 14px', marginTop:10,
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8
          }}>
            <div style={{ fontSize:12, color:'#15803d', fontWeight:600 }}>💰 Price Preview</div>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#64748b' }}>MRP</div>
                <div style={{ fontSize:14, fontWeight:700, textDecoration:'line-through', color:'#94a3b8' }}>₹{parseFloat(form.mrp||0).toFixed(0)}</div>
              </div>
              <div style={{ fontSize:18, color:'#86efac' }}>→</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#64748b' }}>Sale Price</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#15803d' }}>₹{parseFloat(form.price||0).toFixed(0)}</div>
              </div>
              {parseFloat(form.mrp) > parseFloat(form.price) && (
                <div style={{
                  background:'#dc2626', color:'#fff',
                  padding:'4px 10px', borderRadius:20,
                  fontSize:12, fontWeight:800
                }}>
                  {Math.round(((parseFloat(form.mrp) - parseFloat(form.price)) / parseFloat(form.mrp)) * 100)}% OFF
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label>Initial Stock *</label>
            <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="50" />
          </div>
          <div>
            <label>Low Stock Alert Level</label>
            <input type="number" min={0} value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} placeholder="10" />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -8, marginBottom: 10 }}>
          This product will be flagged "Low Stock" once quantity drops to or below this number.
        </div>
        <label>Description</label>
        <textarea value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="Product description" rows={2} />

        {/* Image Upload */}
        <label>Product Image</label>
        <div style={{ border: '2px dashed rgba(250,199,117,0.4)', borderRadius: 10, padding: '12px', textAlign: 'center', marginBottom: 4 }}>
          {form.image ? (
            <div style={{ position: 'relative' }}>
              <img src={form.image} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
              <button
                onClick={() => set('image', '')}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 13 }}
              >✕</button>
            </div>
          ) : (
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🖼️</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Click to upload image (max 2MB)</div>
              <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
              <span style={{ background: 'var(--gold)', color: '#1a0a00', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, display:'inline-flex', alignItems:'center', gap:6 }}><i className="ti ti-camera" style={{fontSize:16}}/>Choose Image / Camera</span>
            </label>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave}>{product ? 'Update' : 'Add Product'}</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// BILL PREVIEW MODAL
// ──────────────────────────────────────────────────────────────────────────────
function BillPreview({ bill, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="bill-print">
          <div className="bp-header">
            <h2>🎆 Sivakasi Crackers</h2>
            <p>Premium Quality Fireworks | Sivakasi, Tamil Nadu</p>
            <p style={{ marginTop: '6px', fontSize: '11px' }}>
              Bill No: <strong>{bill.id}</strong> &nbsp;|&nbsp; Date: {new Date(bill.createdAt).toLocaleDateString('en-IN')}
            </p>
            {bill.customerName && (
              <div style={{ fontSize:'11px', marginBottom:6, lineHeight:1.7 }}>
                <div><strong>{bill.customerName}</strong> {bill.customerPhone && `| 📞 ${bill.customerPhone}`}</div>
                {bill.customerAddress && <div style={{ color:'#555' }}>📍 {bill.customerAddress}</div>}
              </div>
            )}
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Product</th><th>Qty</th><th>MRP/Unit</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{item.name}</td>
                  <td style={{ textAlign:'center' }}>{item.qty}</td>
                  <td>₹{item.mrp || item.price}</td>
                  <td>₹{((item.mrp || item.price) * item.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bp-total">
            <div style={{ fontSize:'12px', color:'#555', marginBottom:6, lineHeight:1.8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span>MRP Total</span>
                <span>₹{(bill.mrpTotal || bill.subtotal || 0).toFixed(2)}</span>
              </div>
              {bill.discountPct > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', color:'#16a34a', fontWeight:700 }}>
                  <span>Discount ({bill.discountPct}%)</span>
                  <span>− ₹{(bill.discountAmt || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:800, color:'var(--navy)', borderTop:'2px solid var(--border)', paddingTop:6 }}>
              <span>Grand Total</span>
              <span>₹{bill.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="bp-footer">Thank you for shopping with us! 🎇 &nbsp;•&nbsp; Safe Diwali!</div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}

function OrderPreview({ order, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
        <div className="bill-print">
          <div className="bp-header">
            <h2>🎆 Sivakasi Crackers</h2>
            <p>Order Details</p>
            <p style={{ marginTop: '6px', fontSize: '11px' }}>
              Order No: <strong>{order.id}</strong> &nbsp;|&nbsp; Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}
            </p>
            <div style={{ fontSize:'11px', marginBottom:6, lineHeight:1.7 }}>
              <div><strong>{order.userName || '—'}</strong> {order.userPhone && `| 📞 ${order.userPhone}`}</div>
              {order.shippingAddress && (
                <div style={{ color:'#555' }}>
                  📍 {[order.shippingAddress.address, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Product</th><th>Qty</th><th>Price</th><th>Line Total</th></tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.productId || item.name}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td style={{ textAlign:'center' }}>{item.qty}</td>
                  <td>₹{Number(item.price || 0).toFixed(2)}</td>
                  <td>₹{Number(item.lineTotal ?? (Number(item.price || 0) * item.qty)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bp-total">
            <div style={{ fontSize:'12px', color:'#555', marginBottom:6, lineHeight:1.8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span>Delivery</span>
                <span>₹{Number(order.delivery || 0).toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:800, color:'var(--navy)', borderTop:'2px solid var(--border)', paddingTop:6 }}>
              <span>Total</span>
              <span>₹{Number(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="bp-footer">Status: {order.status} • Thank you for shopping with us! 🎇</div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ──────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard({ onLogout, showToast }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: 'Purchase', note: '', date: '' });
  const [expenseErrors, setExpenseErrors] = useState({});
  const [incomeForm, setIncomeForm] = useState({ title: '', amount: '', category: 'Sales', note: '', date: '' });
  const [incomeErrors, setIncomeErrors] = useState({});
  const [incomes, setIncomes] = useState([]);
  const [collections, setCollections] = useState({ giftbox: [], combo: [], new_arrivals: [], offers: [] });
  const [collTab, setCollTab] = useState('giftbox');
  const [collForm, setCollForm] = useState({ name: '', desc: '', price: '', mrp: '', discount: '', stock: '', lowStockThreshold: '10', image: '' });
  const [collEditId, setCollEditId] = useState(null);
  const [collErrors, setCollErrors] = useState({});
  const [orderFilter, setOrderFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [addQty, setAddQty] = useState({});
  const [thresholdEdits, setThresholdEdits] = useState({});
  const [productModal, setProductModal] = useState(null); // null | 'new' | product object
  const [billPreview, setBillPreview] = useState(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);

  // Billing state
  const [billItems, setBillItems] = useState([{ productId: '', qty: 1 }]);
  const [billCustomer, setBillCustomer] = useState({ name: '', phone: '', address: '' });
  const [billErrors, setBillErrors] = useState({});
  const [billDiscount, setBillDiscount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const [o, p, b, ex, inc, gb, cb, na, of, cats] = await Promise.all([getOrders(), getProducts(), getBills(), getExpenses(), getIncomes(), getCollection('giftbox'), getCollection('combo'), getCollection('new_arrivals'), getCollection('offers'), getExtraCategories()]);
      setOrders(o);
      setProducts(p);
      setBills(b);
      setExpenses(ex);
      setIncomes(inc);
      setCollections({ giftbox: gb, combo: cb, new_arrivals: na, offers: of });
      setCustomCategories(cats);
    } catch (err) {
      showToast('Could not load data from server');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleAddCategory = async (categories) => {
    try {
      await saveExtraCategories(categories);
      setCustomCategories(categories);
    } catch {
      showToast('Could not save category');
    }
  };

  useEffect(() => { reload(); }, [reload]);

  // ── ORDERS ─────────────────────────────────────────────────────────────────
  const markShipped = async (orderId) => {
    try {
      // Firestore updates status and creates the customer notification.
      const updated = await shipOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      showToast(`Order ${orderId} marked as shipped! Customer notified.`);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not ship order');
    }
  };

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status.toLowerCase() === orderFilter);

  // Each product carries its own lowStockThreshold (set via Add/Edit Product form,
  // or editable inline in the Stock Management tab). Falls back to 10 if unset
  // (e.g. for products created before this field existed).
  const thresholdFor = (p) => (p.lowStockThreshold ?? 10);
  const isLow = (p) => p.stock > 0 && p.stock <= thresholdFor(p);
  const isOut = (p) => p.stock === 0;

  // ── STATS ──────────────────────────────────────────────────────────────────
  const stats = {
    orders: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    shipped: orders.filter(o => o.status === 'Shipped').length,
    revenue: orders.reduce((s, o) => s + o.total, 0),
    lowStock: products.filter(isLow).length,
    outStock: products.filter(isOut).length,
    billTotal: bills.reduce((s, b) => s + b.total, 0),
    manualIncome: incomes.reduce((s, i) => s + i.amount, 0),
    totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
    totalIncome: orders.reduce((s, o) => s + o.total, 0) + bills.reduce((s, b) => s + b.total, 0) + incomes.reduce((s, i) => s + i.amount, 0),
    get totalProfit() { return this.totalIncome - this.totalExpenses; },
  };

  const EXPENSE_CATEGORIES = ['Purchase', 'Transport', 'Labour', 'Rent', 'Electricity', 'Packaging', 'Marketing', 'Other'];

  const handleAddExpense = async () => {
    const errs = {};
    if (!expenseForm.title.trim()) errs.title = 'Required';
    if (!expenseForm.amount || isNaN(expenseForm.amount) || Number(expenseForm.amount) <= 0) errs.amount = 'Enter valid amount';
    setExpenseErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await addExpense({ ...expenseForm, date: expenseForm.date || new Date().toISOString() });
      setExpenseForm({ title: '', amount: '', category: 'Purchase', note: '', date: '' });
      setExpenseErrors({});
      await reload();
      showToast('Expense added!');
    } catch (err) { showToast('Could not add expense'); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      await reload();
      showToast('Expense deleted.');
    } catch (err) { showToast('Could not delete expense'); }
  };

  // ── COLLECTION HANDLERS ──────────────────────────────────────
  const COLL_TYPES = [
    { key: 'giftbox',      label: '🎁 Gift Boxes',    color: '#d97706' },
    { key: 'combo',        label: '📦 Combo Packs',   color: '#7c3aed' },
    { key: 'new_arrivals', label: '✨ New Arrivals',  color: '#0ea5e9' },
    { key: 'offers',       label: '🏷️ Offers',       color: '#ef4444' },
  ];

  const collValidate = () => {
    const e = {};
    if (!collForm.name.trim()) e.name = 'Required';
    if (!collForm.price || isNaN(collForm.price) || Number(collForm.price) <= 0) e.price = 'Valid price needed';
    if (!collForm.stock || isNaN(collForm.stock) || Number(collForm.stock) < 0) e.stock = 'Valid stock needed';
    setCollErrors(e);
    return !Object.keys(e).length;
  };

  const handleCollImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCollForm(p => ({ ...p, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleCollSave = async () => {
    if (!collValidate()) return;
    const collectionType = tab === 'offers' ? 'offers' : collTab;
    try {
      if (collEditId) {
        await updateInCollection(collectionType, collEditId, collForm);
        showToast('Updated! ✅');
      } else {
        await addToCollection(collectionType, collForm);
        showToast('Added! ✅');
      }
      setCollForm({ name: '', desc: '', price: '', mrp: '', discount: '', stock: '', lowStockThreshold: '10', image: '' });
      setCollEditId(null);
      setCollErrors({});
      await reload();
    } catch { showToast('Could not save item'); }
  };

  const handleCollEdit = (item) => {
    setCollEditId(item.id);
    const editDisc = item.discount ?? (item.mrp > item.price ? Math.round(((item.mrp-item.price)/item.mrp)*100) : 0);
    setCollForm({ name: item.name, desc: item.desc || '', price: String(item.price), mrp: String(item.mrp || item.price), discount: String(editDisc), stock: String(item.stock), lowStockThreshold: String(item.lowStockThreshold || 10), image: item.image || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCollDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    const collectionType = tab === 'offers' ? 'offers' : collTab;
    try {
      await deleteFromCollection(collectionType, id);
      await reload();
      showToast('Deleted.');
    } catch { showToast('Could not delete'); }
  };

  const INCOME_CATEGORIES = ['Sales', 'Online Order', 'Wholesale', 'Advance', 'Refund Received', 'Other'];

  const handleAddIncome = async () => {
    const errs = {};
    if (!incomeForm.title.trim()) errs.title = 'Required';
    if (!incomeForm.amount || isNaN(incomeForm.amount) || Number(incomeForm.amount) <= 0) errs.amount = 'Enter valid amount';
    setIncomeErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await addIncomeAPI({ ...incomeForm, date: incomeForm.date || new Date().toISOString() });
      setIncomeForm({ title: '', amount: '', category: 'Sales', note: '', date: '' });
      setIncomeErrors({});
      await reload();
      showToast('Income added! ✅');
    } catch (err) { showToast('Could not add income'); }
  };

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await deleteIncome(id);
      await reload();
      showToast('Income deleted.');
    } catch {
      showToast('Could not delete income');
    }
  };

  // ── STOCK MANAGEMENT ───────────────────────────────────────────────────────
  const filteredStock = products.filter(p => {
    if (stockFilter === 'low') return isLow(p);
    if (stockFilter === 'out') return isOut(p);
    return true;
  });

  // Per-product "low stock alert level" inputs — keyed by product id, so each
  // row edits independently without affecting any other product.
  const saveThreshold = async (product) => {
    const raw = thresholdEdits[product.id];
    const v = parseInt(raw, 10);
    if (raw === undefined || isNaN(v) || v < 0) { showToast('Enter a valid number'); return; }
    try {
      await updateProduct(product.id, { ...product, lowStockThreshold: v });
      setThresholdEdits(prev => { const n = { ...prev }; delete n[product.id]; return n; });
      await reload();
      showToast(`${product.name}: low stock alert set to ${v}`);
    } catch {
      showToast('Could not update threshold');
    }
  };

  const handleAddStock = async (productId) => {
    const q = parseInt(addQty[productId] || 0);
    if (!q || q <= 0) { showToast('Enter a valid quantity'); return; }
    try {
      await addStockToProduct(productId, q);
      setAddQty(p => ({ ...p, [productId]: '' }));
      await reload();
      showToast(`Stock added successfully!`);
    } catch (err) {
      showToast('Could not add stock');
    }
  };

  // ── PRODUCTS CRUD ──────────────────────────────────────────────────────────
  const handleSaveProduct = async (form) => {
    try {
      if (form.id) {
        await updateProduct(form.id, form);
        showToast('Product updated!');
      } else {
        await addProduct(form);
        showToast('Product added!');
      }
      await reload();
    } catch (err) {
      showToast('Could not save product');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      await reload();
      showToast('Product deleted.');
    } catch (err) {
      showToast('Could not delete product');
    }
  };

  // ── BILLING ────────────────────────────────────────────────────────────────
  const billCalc = () => {
    let mrpTotal = 0;
    billItems.forEach(item => {
      const p = products.find(x => String(x.id) === String(item.productId));
      if (p) mrpTotal += (p.mrp || p.price) * item.qty;
    });
    const discountAmt = mrpTotal * (billDiscount / 100);
    const total = mrpTotal - discountAmt;
    return { mrpTotal, discountAmt, total };
  };

  const addBillItem = () => setBillItems(p => [...p, { productId: '', qty: 1 }]);
  const removeBillItem = (i) => setBillItems(p => p.filter((_, idx) => idx !== i));
  const setBillItem = (i, k, v) => setBillItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const handleGenerateBill = async () => {
    const bErrs = {};
    if (!billCustomer.name.trim()) bErrs.name = 'Customer name is required';
    if (!/^\d{10}$/.test(billCustomer.phone)) bErrs.phone = 'Valid 10-digit phone required';
    if (!billCustomer.address.trim()) bErrs.address = 'Address is required';
    setBillErrors(bErrs);
    if (Object.keys(bErrs).length) return;
    const validItems = billItems.filter(i => i.productId);
    if (!validItems.length) { showToast('Add at least one product'); return; }

    const itemsWithDetails = validItems.map(i => {
      const p = products.find(x => String(x.id) === String(i.productId));
      return { productId: i.productId, name: p.name, qty: parseInt(i.qty) || 1, price: p.price, mrp: p.mrp || p.price };
    });

    // Check stock
    for (const item of itemsWithDetails) {
      const p = products.find(x => String(x.id) === String(item.productId));
      if (item.qty > p.stock) { showToast(`Insufficient stock for ${item.name}`); return; }
    }

    const { mrpTotal, discountAmt, total } = billCalc();

    try {
      const bill = await createBill({
        customerName: billCustomer.name,
        customerPhone: billCustomer.phone,
        customerAddress: billCustomer.address,
        items: itemsWithDetails,
        subtotal: mrpTotal, mrpTotal, discountPct: billDiscount, discountAmt, tax: 0, taxPct: 0, total
      });

      setBillPreview(bill);
      setBillItems([{ productId: '', qty: 1 }]);
      setBillCustomer({ name: '', phone: '', address: '' });
      setBillErrors({});
      await reload();
      showToast('Bill generated!');
    } catch (err) {
      showToast('Could not generate bill');
    }
  };

  // billCalc used inline in JSX now

  const handleLogout = () => { onLogout(); navigate('/login'); };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="admin-layout">
      {/* Mobile overlay when sidebar open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:98 }}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`admin-sidebar${sidebarOpen ? ' sb-open' : ''}`}>
        <div className="sb-logo">
          <span>🎆 Sivakasi Crackers</span>
          <small>Admin Panel</small>
        </div>
        <nav>
          {TABS.map(t => (
            <div key={t.id} className={`sb-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); setSidebarOpen(false); }}>
              <i className={`ti ${t.icon}`} />
              {t.label}
            </div>
          ))}
        </nav>
        <div className="sb-logout">
          <button type="button" onClick={handleLogout}>↪ Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        <div className="admin-topbar">
          {/* Hamburger — visible only on mobile */}
          <button
            type="button"
            className="admin-hamburger"
            onClick={() => setSidebarOpen(p => !p)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
          <h2>{TABS.find(t => t.id === tab)?.label}</h2>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="admin-content">

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>Loading data from server...</div>
          ) : (
          <>
          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && (
            <div>
              {/* ── Profit Summary Banner ── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
                <div style={{ background:'linear-gradient(135deg,#0f6e56,#1a8754)', borderRadius:14, padding:'18px 22px', color:'#fff' }}>
                  <div style={{ fontSize:11, opacity:.8, marginBottom:4 }}>💰 Total Income</div>
                  <div style={{ fontSize:26, fontWeight:800 }}>₹{stats.totalIncome.toFixed(0)}</div>
                  <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>Orders + Bills</div>
                </div>
                <div style={{ background:'linear-gradient(135deg,#7f1d1d,#b91c1c)', borderRadius:14, padding:'18px 22px', color:'#fff' }}>
                  <div style={{ fontSize:11, opacity:.8, marginBottom:4 }}>📤 Total Expenses</div>
                  <div style={{ fontSize:26, fontWeight:800 }}>₹{stats.totalExpenses.toFixed(0)}</div>
                  <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>{expenses.length} entries</div>
                </div>
                <div style={{ background: stats.totalProfit >= 0 ? 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' : 'linear-gradient(135deg,#4c1d95,#7c3aed)', borderRadius:14, padding:'18px 22px', color:'#fff' }}>
                  <div style={{ fontSize:11, opacity:.8, marginBottom:4 }}>{stats.totalProfit >= 0 ? '📈 Net Profit' : '📉 Net Loss'}</div>
                  <div style={{ fontSize:26, fontWeight:800 }}>₹{Math.abs(stats.totalProfit).toFixed(0)}</div>
                  <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>Income − Expenses</div>
                </div>
              </div>

              <div className="stat-grid">
                {[
                  { label: 'Total Orders', val: stats.orders, color: '#1d1f4d', bg: '#e8e9ff', icon: 'ti-package' },
                  { label: 'Pending Orders', val: stats.pending, color: '#e53e3e', bg: '#ffe0e0', icon: 'ti-clock' },
                  { label: 'Shipped Orders', val: stats.shipped, color: '#22c55e', bg: '#d1f5e0', icon: 'ti-truck' },
                  { label: 'Order Revenue', val: `₹${stats.revenue.toFixed(0)}`, color: '#FAC775', bg: '#fff8e0', icon: 'ti-currency-rupee' },
                  { label: 'Low Stock Items', val: stats.lowStock, color: '#f97316', bg: '#fff0e0', icon: 'ti-alert-triangle' },
                  { label: 'Out of Stock', val: stats.outStock, color: '#e53e3e', bg: '#ffe0e0', icon: 'ti-box-off' },
                  { label: 'Bills Generated', val: bills.length, color: '#0ea5e9', bg: '#e0f4ff', icon: 'ti-file-invoice' },
                  { label: 'Bill Revenue', val: `₹${stats.billTotal.toFixed(0)}`, color: '#8b5cf6', bg: '#f0e8ff', icon: 'ti-receipt' },
                ].map(s => (
                  <div className="stat-card" key={s.label} style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div>
                      <div className="sc-num" style={{ color: s.color }}>{s.val}</div>
                      <div className="sc-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="admin-table-wrap">
                  <div className="admin-table-head"><h3>🕐 Recent Orders</h3>
                    <button type="button" className="filter-btn active" onClick={() => setTab('orders')}>View All</button>
                  </div>
                  <table>
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '11px' }}>{o.id}</td>
                          <td>{o.userName}</td>
                          <td>₹{o.total.toFixed(0)}</td>
                          <td><span className={`status-pill ${o.status === 'Pending' ? 'pill-pending' : 'pill-shipped'}`}>{o.status}</span></td>
                        </tr>
                      ))}
                      {!orders.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>No orders yet</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="admin-table-wrap">
                  <div className="admin-table-head"><h3>⚠️ Low / Out of Stock</h3></div>
                  <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Stock</th></tr></thead>
                    <tbody>
                      {products.filter(p => isLow(p) || isOut(p)).slice(0, 6).map(p => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '11px' }}>{p.category}</td>
                          <td><span className={`stock-badge ${isOut(p) ? 'out' : 'low'}`}>{isOut(p) ? 'Out' : p.stock}</span></td>
                        </tr>
                      ))}
                      {!products.filter(p => isLow(p) || isOut(p)).length && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>All stock OK ✅</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div>
              <div className="filter-bar">
                {['all','pending','shipped'].map(f => (
                  <button type="button" key={f} className={`filter-btn ${orderFilter === f ? 'active' : ''}`} onClick={() => setOrderFilter(f)}>
                    {f === 'all' ? 'All Orders' : f === 'pending' ? '⏳ Pending' : '🚚 Shipped'}
                  </button>
                ))}
              </div>
              <div className="admin-table-wrap">
                <div className="admin-table-head">
                  <h3>Orders ({filteredOrders.length})</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Delivery Address</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '11px' }}>{o.id}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.userName}</div>
                            {o.userPhone && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{o.userPhone}</div>}
                          </td>
                          <td>
                            <div style={{ fontSize: '11px', marginBottom: 6 }}>{o.items.length} item(s)</div>
                            <button type="button" className="filter-btn" onClick={() => setOrderPreview(o)}>🔍 View</button>
                          </td>
                          <td style={{ fontWeight: 700 }}>₹{o.total.toFixed(0)}</td>
                          <td><span className={`status-pill ${o.status === 'Pending' ? 'pill-pending' : 'pill-shipped'}`}>{o.status}</span></td>
                          <td style={{ fontSize: '11px' }}>{o.shippingAddress?.city}, {o.shippingAddress?.state}<br/>{o.shippingAddress?.pincode}</td>
                          <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>
                            {o.status === 'Pending' ? (
                              <button type="button" className="ship-btn" onClick={() => markShipped(o.id)}>🚚 Ship</button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--green)' }}>✅ Shipped</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!filteredOrders.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>No orders found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── STOCK MANAGEMENT ── */}
          {tab === 'stock' && (
            <div>
              <div className="filter-bar">
                {[['all','📦 All Products'],['low','⚠️ Low Stock'],['out','❌ Out of Stock']].map(([f,l]) => (
                  <button type="button" key={f} className={`filter-btn ${stockFilter === f ? 'active' : ''}`} onClick={() => setStockFilter(f)}>{l}</button>
                ))}
              </div>
              <div className="admin-table-wrap stock-table">
                <div className="admin-table-head">
                  <h3>Stock Management ({filteredStock.length} products)</h3>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>
                    Each product has its own "Low Stock Alert" level — edit it in the table below.
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Category</th><th>Price</th><th>Current Stock</th><th>Low Stock Alert Level</th><th>Status</th><th>Add Stock</th></tr>
                    </thead>
                    <tbody>
                      {filteredStock.map(p => {
                        const threshold = thresholdFor(p);
                        const cls = isOut(p) ? 'stock-out' : isLow(p) ? 'stock-low' : 'stock-ok';
                        const badge = isOut(p) ? 'out' : isLow(p) ? 'low' : 'ok';
                        const label = isOut(p) ? 'Out of Stock' : isLow(p) ? 'Low Stock' : 'In Stock';
                        const editing = thresholdEdits[p.id] !== undefined;
                        return (
                          <tr key={p.id} className={cls}>
                            <td><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.desc}</div></td>
                            <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{p.category}</td>
                            <td>₹{p.price}</td>
                            <td style={{ fontWeight: 700, fontSize: '18px', color: isOut(p) ? 'var(--red)' : isLow(p) ? 'var(--orange)' : 'var(--green)' }}>{p.stock}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="number" min={0}
                                  value={editing ? thresholdEdits[p.id] : threshold}
                                  onChange={e => setThresholdEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') saveThreshold(p); }}
                                  style={{ width: 64, padding: '4px 8px', border: '1px solid var(--gold)', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                                />
                                {editing && (
                                  <button
                                    type="button"
                                    onClick={() => saveThreshold(p)}
                                    style={{ background: 'var(--gold)', color: '#1a0a00', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                                  >Save</button>
                                )}
                              </div>
                            </td>
                            <td><span className={`stock-badge ${badge}`}>{label}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  className="stock-add-input"
                                  min={1}
                                  placeholder="Qty"
                                  value={addQty[p.id] || ''}
                                  onChange={e => setAddQty(q => ({ ...q, [p.id]: e.target.value }))}
                                />
                                <button type="button" className="stock-add-btn" onClick={() => handleAddStock(p.id)}>+ Add</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── BILLING ── */}
          {tab === 'billing' && (
            <div style={{ maxWidth: '720px' }}>
              <div className="billing-form">
                <h3>🧾 New Bill</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '4px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Customer Name <span style={{color:'var(--red)'}}>*</span></label>
                    <input
                      style={{ width: '100%', padding: '8px 12px', border: `1px solid ${billErrors.name ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', fontSize: '13px', boxSizing:'border-box' }}
                      value={billCustomer.name}
                      onChange={e => { setBillCustomer(p => ({ ...p, name: e.target.value })); setBillErrors(p => ({...p, name:''})); }}
                      placeholder="e.g. Murugan Kumar"
                    />
                    {billErrors.name && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{billErrors.name}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Customer Phone <span style={{color:'var(--red)'}}>*</span></label>
                    <input
                      style={{ width: '100%', padding: '8px 12px', border: `1px solid ${billErrors.phone ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', fontSize: '13px', boxSizing:'border-box' }}
                      value={billCustomer.phone}
                      onChange={e => { setBillCustomer(p => ({ ...p, phone: e.target.value })); setBillErrors(p => ({...p, phone:''})); }}
                      placeholder="9876543210"
                      maxLength={10}
                      inputMode="numeric"
                    />
                    {billErrors.phone && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{billErrors.phone}</div>}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Customer Address <span style={{color:'var(--red)'}}>*</span></label>
                  <textarea
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${billErrors.address ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', fontSize: '13px', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', color:'inherit' }}
                    rows={3}
                    value={billCustomer.address}
                    onChange={e => { setBillCustomer(p => ({ ...p, address: e.target.value })); setBillErrors(p => ({...p, address:''})); }}
                    placeholder="Door no, Street, Area, City, Pincode..."
                  />
                  {billErrors.address && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{billErrors.address}</div>}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--navy)' }}>Bill Items</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
                  Grid: Product | Qty | Unit Price | Remove
                </div>

                <div className="billing-items">
                  {billItems.map((item, i) => {
                    const selProd = products.find(x => String(x.id) === String(item.productId));
                    return (
                      <div className="billing-item-row" key={i}>
                        <SelectableSearch
                          value={item.productId}
                          placeholder="Select product..."
                          options={products.map(p => ({
                            value: String(p.id),
                            label: `${p.name} (MRP: ₹${p.mrp || p.price}) [Stock: ${p.stock}]`,
                          }))}
                          onChange={(value) => setBillItem(i, 'productId', value)}
                        />
                        <input type="number" min={1} max={selProd?.stock || 999} value={item.qty}
                          onChange={e => setBillItem(i, 'qty', e.target.value)} placeholder="Qty" />
                        <div style={{ padding: '7px 8px', background: '#f8f8ff', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--navy)' }}>
                          ₹{selProd ? ((selProd.mrp || selProd.price) * (parseInt(item.qty) || 0)).toFixed(0) : '0'}
                        </div>
                        <button type="button" onClick={() => removeBillItem(i)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '6px', height: '34px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                      </div>
                    );
                  })}
                  <button type="button" className="add-item-btn" onClick={addBillItem}>+ Add Item</button>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, flexWrap:'wrap' }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--navy)' }}>Discount %:</label>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {/* {[0,5,10,15,20,25].map(d => (
                      <button key={d} type="button"
                        onClick={() => setBillDiscount(d)}
                        style={{
                          padding:'5px 11px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer',
                          border: billDiscount===d ? '2px solid var(--navy)' : '1px solid var(--border)',
                          background: billDiscount===d ? 'var(--navy)' : '#fff',
                          color: billDiscount===d ? 'var(--gold)' : 'var(--muted)',
                        }}
                      >{d}%</button>
                    ))} */}
                    <div style={{ display:'flex', alignItems:'center', border:'1px solid var(--border)', borderRadius:7, overflow:'hidden' }}>
                      <input type="number" min={0} max={99}
                        value={billDiscount}
                        onChange={e => setBillDiscount(Number(e.target.value))}
                        style={{ height: 50, width:60, padding:'5px 8px', border:'none', fontSize:13, textAlign:'center' }}
                        placeholder="0"
                      />
                      <span style={{ padding:'0 8px', color:'var(--muted)', fontSize:12, background:'#f8f8ff' }}>%</span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const { mrpTotal, discountAmt, total } = billCalc();
                  return (
                    <div className="bill-summary">
                      <div className="bill-row"><span>MRP Total</span><span>₹{mrpTotal.toFixed(2)}</span></div>
                      {billDiscount > 0 && (
                        <div className="bill-row" style={{ color:'#16a34a', fontWeight:700 }}>
                          <span>Discount ({billDiscount}%)</span>
                          <span>− ₹{discountAmt.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="bill-row bill-total"><span>Grand Total</span><span>₹{total.toFixed(2)}</span></div>
                    </div>
                  );
                })()}

                <button type="button" className="generate-bill-btn" onClick={handleGenerateBill}>
                  🧾 Generate Bill
                </button>
              </div>
            </div>
          )}

          {/* ── BILL HISTORY ── */}
          {tab === 'bills' && (
            <div className="admin-table-wrap">
              <div className="admin-table-head">
                <h3>Bill History ({bills.length})</h3>
                <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 700 }}>
                  Total: ₹{stats.billTotal.toFixed(2)}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Bill ID</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Date</th><th>View</th></tr>
                  </thead>
                  <tbody>
                    {bills.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '11px' }}>{b.id}</td>
                        <td>{b.customerName || '—'}</td>
                        <td>{b.items.length} item(s)</td>
                        <td>₹{b.subtotal.toFixed(0)}</td>
                        <td>₹{b.tax.toFixed(0)}</td>
                        <td style={{ fontWeight: 700 }}>₹{b.total.toFixed(0)}</td>
                        <td style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                        <td><button type="button" className="filter-btn" onClick={() => setBillPreview(b)}>🔍 View</button></td>
                      </tr>
                    ))}
                    {!bills.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>No bills yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EXPENSES ── */}
          {tab === 'expenses' && (
            <div>
              {/* Add Expense Form */}
              <div className="billing-form" style={{ maxWidth: 680, marginBottom: 24 }}>
                <h3>➕ Add Expense</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Title *</label>
                    <input
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={expenseForm.title}
                      onChange={e => setExpenseForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Stock purchase from supplier"
                    />
                    {expenseErrors.title && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{expenseErrors.title}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Amount (₹) *</label>
                    <input
                      type="number"
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="5000"
                      min={0}
                    />
                    {expenseErrors.amount && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{expenseErrors.amount}</div>}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Category</label>
                    <select
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={expenseForm.category}
                      onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}
                    >
                      {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Date</label>
                    <input
                      type="date"
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={expenseForm.date ? expenseForm.date.slice(0,10) : ''}
                      onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Note (optional)</label>
                  <input
                    style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                    value={expenseForm.note}
                    onChange={e => setExpenseForm(p => ({ ...p, note: e.target.value }))}
                    placeholder="Additional details..."
                  />
                </div>
                <button type="button" className="generate-bill-btn" onClick={handleAddExpense}>💾 Save Expense</button>
              </div>

              {/* Expense Summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
                <div style={{ background:'#fff8e0', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid var(--gold)' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Total Expenses</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#b45309' }}>₹{stats.totalExpenses.toFixed(2)}</div>
                </div>
                <div style={{ background:'#fff0e0', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid #f97316' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>No. of Entries</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#ea580c' }}>{expenses.length}</div>
                </div>
                <div style={{ background:'#ffe0e0', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid var(--red)' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>This Month</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--red)' }}>
                    ₹{expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s,e) => s+e.amount, 0).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Expense History Table */}
              <div className="admin-table-wrap">
                <div className="admin-table-head">
                  <h3>📋 Expense History ({expenses.length})</h3>
                  <span style={{ fontSize:13, color:'var(--red)', fontWeight:700 }}>Total: ₹{stats.totalExpenses.toFixed(2)}</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Note</th><th>Delete</th></tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign:'center', padding:36, color:'var(--muted)' }}>No expenses added yet</td></tr>
                      )}
                      {expenses.map((e, idx) => (
                        <tr key={e.id}>
                          <td style={{ color:'var(--muted)', fontSize:11 }}>{idx+1}</td>
                          <td style={{ fontWeight:600 }}>{e.title}</td>
                          <td><span style={{ background:'#fff0e0', color:'#ea580c', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{e.category}</span></td>
                          <td style={{ fontWeight:700, color:'var(--red)' }}>₹{e.amount.toFixed(2)}</td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{e.note || '—'}</td>
                          <td><button type="button" className="btn-danger" style={{ padding:'4px 10px', fontSize:12 }} onClick={() => handleDeleteExpense(e.id)}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── INCOME HISTORY ── */}
          {tab === 'income' && (
            <div>

              {/* ── Add Manual Income Form ── */}
              <div className="billing-form" style={{ maxWidth:680, marginBottom:24 }}>
                <h3>➕ Add Income Entry</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Title *</label>
                    <input
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={incomeForm.title}
                      onChange={e => setIncomeForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Cash sale at shop"
                    />
                    {incomeErrors.title && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{incomeErrors.title}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Amount (₹) *</label>
                    <input
                      type="number" min={0}
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={incomeForm.amount}
                      onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="5000"
                    />
                    {incomeErrors.amount && <div style={{ color:'var(--red)', fontSize:11, marginTop:3 }}>{incomeErrors.amount}</div>}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Category</label>
                    <select
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={incomeForm.category}
                      onChange={e => setIncomeForm(p => ({ ...p, category: e.target.value }))}
                    >
                      {(INCOME_CATEGORIES || ['Sales','Online Order','Wholesale','Advance','Refund Received','Other']).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Date</label>
                    <input
                      type="date"
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={incomeForm.date ? incomeForm.date.slice(0,10) : ''}
                      onChange={e => setIncomeForm(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Note (optional)</label>
                  <input
                    style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                    value={incomeForm.note}
                    onChange={e => setIncomeForm(p => ({ ...p, note: e.target.value }))}
                    placeholder="Additional details..."
                  />
                </div>
                <button type="button" className="generate-bill-btn" style={{ background:'#16a34a', color:'#fff' }} onClick={handleAddIncome}>
                  💾 Save Income
                </button>
              </div>

              {/* Income Summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
                <div style={{ background:'#d1f5e0', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid #22c55e' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Order Income</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#15803d' }}>₹{stats.revenue.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{orders.length} orders</div>
                </div>
                <div style={{ background:'#f0e8ff', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid #8b5cf6' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Bill Income</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#7c3aed' }}>₹{stats.billTotal.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{bills.length} bills</div>
                </div>
                <div style={{ background:'#e0f4ff', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid #0ea5e9' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Total Income</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#0284c7' }}>₹{stats.totalIncome.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Orders + Bills + Manual</div>
                </div>
                <div style={{ background:'#fdf2f8', borderRadius:12, padding:'14px 18px', borderLeft:'4px solid #db2777' }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Manual Income</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#be185d' }}>₹{stats.manualIncome.toFixed(2)}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{incomes.length} entries</div>
                </div>
              </div>

              {/* Profit/Loss Card */}
              <div style={{ background: stats.totalProfit >= 0 ? 'linear-gradient(135deg,#0f6e56,#1a8754)' : 'linear-gradient(135deg,#7f1d1d,#b91c1c)', borderRadius:14, padding:'20px 26px', color:'#fff', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:13, opacity:.85, marginBottom:4 }}>{stats.totalProfit >= 0 ? '📈 Net Profit' : '📉 Net Loss'}</div>
                  <div style={{ fontSize:32, fontWeight:800 }}>₹{Math.abs(stats.totalProfit).toFixed(2)}</div>
                  <div style={{ fontSize:12, opacity:.75, marginTop:4 }}>Income ₹{stats.totalIncome.toFixed(0)} − Expenses ₹{stats.totalExpenses.toFixed(0)}</div>
                </div>
                <div style={{ fontSize:60, opacity:.3 }}>{stats.totalProfit >= 0 ? '💰' : '📉'}</div>
              </div>

              {/* Order Income Table */}
              <div className="admin-table-wrap" style={{ marginBottom:24 }}>
                <div className="admin-table-head">
                  <h3>🛒 Order Income ({orders.length})</h3>
                  <span style={{ fontSize:13, color:'var(--green)', fontWeight:700 }}>₹{stats.revenue.toFixed(2)}</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table>
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Delivery</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {orders.length === 0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:36, color:'var(--muted)' }}>No orders yet</td></tr>}
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight:700, color:'var(--gold)', fontSize:11 }}>{o.id}</td>
                          <td>
                            <div style={{ fontWeight:600 }}>{o.userName}</div>
                            {o.userPhone && <div style={{ fontSize:11, color:'var(--muted)' }}>{o.userPhone}</div>}
                          </td>
                          <td style={{ fontSize:11 }}>{o.items.length} item(s)</td>
                          <td>₹{(o.subtotal||0).toFixed(0)}</td>
                          <td>₹{(o.delivery||0).toFixed(0)}</td>
                          <td style={{ fontWeight:700, color:'var(--green)' }}>₹{o.total.toFixed(0)}</td>
                          <td><span className={`status-pill ${o.status === 'Pending' ? 'pill-pending' : 'pill-shipped'}`}>{o.status}</span></td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Income Table */}
              <div className="admin-table-wrap">
                <div className="admin-table-head">
                  <h3>🧾 Bill Income ({bills.length})</h3>
                  <span style={{ fontSize:13, color:'#8b5cf6', fontWeight:700 }}>₹{stats.billTotal.toFixed(2)}</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table>
                    <thead><tr><th>Bill ID</th><th>Customer</th><th>Phone</th><th>Address</th><th>Items</th><th>MRP Total</th><th>Discount</th><th>Total</th><th>Date</th></tr></thead>
                    <tbody>
                      {bills.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:36, color:'var(--muted)' }}>No bills yet</td></tr>}
                      {bills.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight:700, color:'var(--gold)', fontSize:11 }}>{b.id}</td>
                          <td style={{ fontWeight:600 }}>{b.customerName || '—'}</td>
                          <td style={{ fontSize:11 }}>{b.customerPhone || '—'}</td>
                          <td style={{ fontSize:11, maxWidth:120, wordBreak:'break-word' }}>{b.customerAddress || '—'}</td>
                          <td style={{ fontSize:11 }}>{b.items.length} item(s)</td>
                          <td style={{ fontSize:12 }}>₹{(b.mrpTotal || b.subtotal || 0).toFixed(0)}</td>
                          <td>
                            {b.discountPct > 0
                              ? <span style={{ background:'#d1fae5', color:'#065f46', padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:700 }}>{b.discountPct}% (−₹{(b.discountAmt||0).toFixed(0)})</span>
                              : <span style={{ color:'var(--muted)', fontSize:11 }}>—</span>
                            }
                          </td>
                          <td style={{ fontWeight:700, color:'#8b5cf6' }}>₹{b.total.toFixed(0)}</td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-table-wrap" style={{ marginTop:24 }}>
                <div className="admin-table-head">
                  <h3>💵 Manual Income ({incomes.length})</h3>
                  <span style={{ fontSize:13, color:'#0284c7', fontWeight:700 }}>₹{stats.manualIncome.toFixed(2)}</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table>
                    <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Note</th><th>Delete</th></tr></thead>
                    <tbody>
                      {incomes.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:36, color:'var(--muted)' }}>No manual income entries yet</td></tr>}
                      {incomes.map((entry, index) => (
                        <tr key={entry.id}>
                          <td style={{ color:'var(--muted)', fontSize:11 }}>{index + 1}</td>
                          <td style={{ fontWeight:600 }}>{entry.title}</td>
                          <td><span style={{ background:'#e0f4ff', color:'#0284c7', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{entry.category}</span></td>
                          <td style={{ fontWeight:700, color:'#0284c7' }}>₹{entry.amount.toFixed(2)}</td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{entry.note || '—'}</td>
                          <td><button type="button" className="btn-danger" style={{ padding:'4px 10px', fontSize:12 }} onClick={() => handleDeleteIncome(entry.id)}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'products' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ margin:0, fontSize:15, color:'var(--navy)' }}>All Products ({products.length})</h3>
                <button type="button" className="btn-primary" onClick={() => setProductModal('new')}>+ Add Product</button>
              </div>

              {/* Product Cards Grid — same look as user dashboard */}
              <div className="products-grid">
                {products.map(p => {
                  const disc = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                  const badgeCls = isOut(p) ? 'out' : isLow(p) ? 'low' : 'ok';
                  const badgeLbl = isOut(p) ? 'Out of Stock' : isLow(p) ? `Only ${p.stock} left` : `${p.stock} in stock`;
                  return (
                    <div className="pcard" key={p.id} style={{ position:'relative' }}>
                      {/* ── Image Area — click to change image ── */}
                        <div className="imgwrap" style={{ position:'relative' }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'12px 12px 0 0' }} />
                        ) : (
                          <i className="ti ti-sparkles" />
                        )}
                        {disc > 0 && <div className="off">{disc}% OFF</div>}
                        <div className={`stk ${badgeCls}`}>{badgeLbl}</div>

                        {/* ── Real file input — works on mobile ── */}
                        <label
                          htmlFor={`img-upload-${p.id}`}
                          style={{
                            position:'absolute', bottom:8, right:8,
                            background:'rgba(15,12,46,0.82)',
                            border:'1.5px solid rgba(250,199,117,0.5)',
                            color:'var(--gold)', borderRadius:8,
                            padding:'5px 10px', fontSize:11, fontWeight:700,
                            cursor:'pointer', display:'flex', alignItems:'center', gap:4,
                            backdropFilter:'blur(4px)',
                          }}
                        >
                          <i className="ti ti-camera" style={{ fontSize:15 }}/>
                          {p.image ? 'Change' : 'Add Photo'}
                        </label>
                        <input
                          id={`img-upload-${p.id}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display:'none' }}
                          onChange={async (ev) => {
                            const file = ev.target.files[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB'); return; }
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                              try {
                                await updateProduct(p.id, { ...p, image: e.target.result });
                                await reload();
                                showToast('Image updated! ✅');
                              } catch { showToast('Could not update image'); }
                            };
                            reader.readAsDataURL(file);
                            ev.target.value = '';
                          }}
                        />
                      </div>

                      {/* Card Body */}
                      <div className="body">
                        <div className="pname">{p.name}</div>
                        <div className="pdesc">{p.desc} · <span style={{ color:'var(--muted)', fontSize:10 }}>{p.category}</span></div>
                        <div className="pprices">
                          <span className="pmrp">₹{p.mrp}</span>
                          <span className="pprice">₹{p.price}</span>
                        </div>
                        {/* Admin actions */}
                        <div style={{ display:'flex', gap:6, marginTop:8 }}>
                          <button
                            type="button"
                            className="add-cart-btn"
                            style={{ background:'var(--navy)', flex:1 }}
                            onClick={() => setProductModal(p)}
                          >
                            <i className="ti ti-pencil" /> Edit
                          </button>
                          <button
                            type="button"
                            className="add-cart-btn"
                            style={{ background:'#dc2626', flex:'0 0 auto', padding:'0 12px', gap:6, minWidth:72, justifyContent:'center', border:'2px solid #ef4444' }}
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                          >
                            <i className="ti ti-trash" style={{ fontSize:15 }} />
                            <span style={{ fontSize:12, fontWeight:700 }}>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {products.length === 0 && (
                <div style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>📦</div>
                  <div>No products yet. Click "+ Add Product" to get started.</div>
                </div>
              )}
            </div>
          )}

          {/* ── COLLECTIONS / OFFERS ── */}
          {(tab === 'collections' || tab === 'offers') && (
            <div>
              {tab === 'collections' && (
                <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap' }}>
                  {COLL_TYPES.map(ct => (
                    <button type="button" key={ct.key}
                      onClick={() => { setCollTab(ct.key); setCollForm({ name:'',desc:'',price:'',mrp:'',discount:'',stock:'',lowStockThreshold:'10',image:'' }); setCollEditId(null); setCollErrors({}); }}
                      style={{ padding:'10px 20px', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', border:`2px solid ${collTab===ct.key ? ct.color : 'var(--border)'}`, background: collTab===ct.key ? ct.color : 'transparent', color: collTab===ct.key ? '#fff' : 'inherit', transition:'all .2s' }}
                    >{ct.label} ({collections[ct.key]?.length || 0})</button>
                  ))}
                </div>
              )}

              {tab === 'offers' && (
                <div style={{ marginBottom:24, padding:'12px 16px', borderRadius:12, background:'linear-gradient(135deg,#fff1f2,#ffe4e6)', border:'1px solid #fecdd3', color:'#9f1239', fontWeight:700 }}>
                  Manage promotional offers shown on the storefront.
                </div>
              )}

              {/* Add/Edit Form */}
              <div className="billing-form" style={{ maxWidth:700, marginBottom:28 }}>
                <h3>{collEditId ? '✏️ Edit Item' : `➕ Add to ${COLL_TYPES.find(t=>t.key===(tab === 'offers' ? 'offers' : collTab))?.label}`}</h3>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  {/* Name - full width */}
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Name <span style={{color:'var(--red)'}}>*</span></label>
                    <input
                      style={{ width:'100%', padding:'8px 12px', border:`1px solid ${collErrors.name?'var(--red)':'var(--border)'}`, borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={collForm.name}
                      onChange={e => { setCollForm(p=>({...p,name:e.target.value})); setCollErrors(p=>({...p,name:''})); }}
                      placeholder="e.g. Family Celebration Box"
                    />
                    {collErrors.name && <div style={{ color:'var(--red)',fontSize:11,marginTop:3 }}>{collErrors.name}</div>}
                  </div>

                  {/* MRP */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>MRP (₹) <span style={{color:'var(--red)'}}>*</span></label>
                    <input type="number" min={0}
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={collForm.mrp}
                      onChange={e => {
                        const mrp = e.target.value;
                        const disc = parseFloat(collForm.discount)||0;
                        const newPrice = mrp && disc ? (parseFloat(mrp)*(1-disc/100)).toFixed(2) : collForm.price;
                        setCollForm(p=>({...p, mrp, price: newPrice }));
                      }}
                      placeholder="1200"
                    />
                  </div>

                  {/* Discount % */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Discount (%)</label>
                    <input type="number" min={0} max={100}
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={collForm.discount}
                      onChange={e => {
                        const disc = e.target.value;
                        const mrp  = parseFloat(collForm.mrp)||0;
                        const newPrice = mrp && disc ? (mrp*(1-parseFloat(disc)/100)).toFixed(2) : collForm.price;
                        setCollForm(p=>({...p, discount: disc, price: newPrice }));
                      }}
                      placeholder="20"
                    />
                  </div>

                  {/* Sale Price — auto-calculated, read-only feel */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>
                      Sale Price (₹) <span style={{color:'var(--red)'}}>*</span>
                      {collForm.mrp && collForm.discount && (
                        <span style={{ marginLeft:8, color:'#10b981', fontSize:11 }}>
                          ✓ Auto-calculated
                        </span>
                      )}
                    </label>
                    <input type="number" min={0}
                      style={{ width:'100%', padding:'8px 12px', border:`1px solid ${collErrors.price?'var(--red)':collForm.mrp&&collForm.discount?'#10b981':'var(--border)'}`, borderRadius:8, fontSize:13, boxSizing:'border-box', background: collForm.mrp&&collForm.discount?'#f0fff8':'#fff' }}
                      value={collForm.price}
                      onChange={e => {
                        const price = e.target.value;
                        const mrp   = parseFloat(collForm.mrp)||0;
                        const newDisc = mrp && price ? Math.round(((mrp-parseFloat(price))/mrp)*100) : collForm.discount;
                        setCollForm(p=>({...p, price, discount: String(newDisc) }));
                        setCollErrors(p=>({...p,price:''}));
                      }}
                      placeholder="960"
                    />
                    {collErrors.price && <div style={{ color:'var(--red)',fontSize:11,marginTop:3 }}>{collErrors.price}</div>}
                  </div>

                  {/* Stock */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Stock <span style={{color:'var(--red)'}}>*</span></label>
                    <input type="number" min={0}
                      style={{ width:'100%', padding:'8px 12px', border:`1px solid ${collErrors.stock?'var(--red)':'var(--border)'}`, borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={collForm.stock}
                      onChange={e => { setCollForm(p=>({...p,stock:e.target.value})); setCollErrors(p=>({...p,stock:''})); }}
                      placeholder="20"
                    />
                    {collErrors.stock && <div style={{ color:'var(--red)',fontSize:11,marginTop:3 }}>{collErrors.stock}</div>}
                  </div>

                  {/* Low Stock Threshold */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Low Stock Alert (qty)</label>
                    <input type="number" min={1}
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={collForm.lowStockThreshold}
                      onChange={e => setCollForm(p=>({...p,lowStockThreshold:e.target.value}))}
                      placeholder="10"
                    />
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>Show "low stock" warning below this qty</div>
                  </div>

                  {/* Description */}
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Description</label>
                    <input
                      style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
                      value={collForm.desc}
                      onChange={e => setCollForm(p=>({...p,desc:e.target.value}))}
                      placeholder="What's inside..."
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:5 }}>Product Image</label>
                <div style={{ border:'2px dashed rgba(250,199,117,0.4)', borderRadius:10, padding:12, textAlign:'center', marginBottom:12 }}>
                  {collForm.image ? (
                    <div style={{ position:'relative' }}>
                      <img src={collForm.image} alt="preview" style={{ width:'100%', maxHeight:140, objectFit:'cover', borderRadius:8 }} />
                      <button type="button" onClick={() => setCollForm(p=>({...p,image:''}))}
                        style={{ position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:13 }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ cursor:'pointer', display:'block' }}>
                      <div style={{ fontSize:28, marginBottom:4 }}>🖼️</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Click to upload image (max 2MB)</div>
                      <input type="file" accept="image/*" onChange={handleCollImageUpload} style={{ display:'none' }} />
                      <span style={{ background:'var(--gold)',color:'#1a0a00',padding:'6px 16px',borderRadius:6,fontSize:12,fontWeight:700 }}>Choose Image</span>
                    </label>
                  )}
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="generate-bill-btn" onClick={handleCollSave} style={{ flex:1 }}>
                    {collEditId ? '💾 Update Item' : '➕ Add Item'}
                  </button>
                  {collEditId && (
                    <button type="button" onClick={() => { setCollEditId(null); setCollForm({ name:'',desc:'',price:'',mrp:'',stock:'',image:'' }); setCollErrors({}); }}
                      style={{ padding:'10px 18px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'inherit', fontSize:13 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table/Cards */}
              <div className="admin-table-wrap">
                <div className="admin-table-head">
                  <h3>{COLL_TYPES.find(t=>t.key===(tab === 'offers' ? 'offers' : collTab))?.label} Items ({collections[tab === 'offers' ? 'offers' : collTab]?.length || 0})</h3>
                </div>
                {!collections[tab === 'offers' ? 'offers' : collTab]?.length ? (
                  <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🎁</div>
                    <div>No items yet. Add the first one above.</div>
                  </div>
                ) : (
                  <div className="products-grid">
                    {collections[tab === 'offers' ? 'offers' : collTab].map(item => {
                      const disc = item.mrp > item.price ? Math.round(((item.mrp-item.price)/item.mrp)*100) : 0;
                      return (
                        <div className="pcard" key={item.id} style={{ position:'relative' }}>
                          <div className="imgwrap">
                            {item.image
                              ? <img src={item.image} alt={item.name} style={{ width:'100%',height:'100%',objectFit:'cover',borderRadius:'12px 12px 0 0' }} />
                              : null
                            }
                            {disc > 0 && <div className="off">{disc}% OFF</div>}
                            <div className={`stk ${item.stock===0?'out':item.stock<=10?'low':'ok'}`}>
                              {item.stock===0?'Out of Stock':item.stock<=10?`Only ${item.stock} left`:`${item.stock} in stock`}
                            </div>
                          </div>
                          <div className="body">
                            <div className="pname">{item.name}</div>
                            <div className="pdesc">{item.desc}</div>
                            <div className="pprices">
                              {item.mrp > item.price && <span className="pmrp">₹{item.mrp}</span>}
                              <span className="pprice">₹{item.price}</span>
                            </div>
                            <div style={{ display:'flex', gap:6, marginTop:8 }}>
                              <button type="button" className="add-cart-btn" style={{ background:'var(--navy)',flex:1 }} onClick={() => handleCollEdit(item)}>
                                <i className="ti ti-pencil" /> Edit
                              </button>
                              <button type="button" className="add-cart-btn" style={{ background:'#dc2626',flex:'0 0 auto',padding:'0 12px',gap:6,minWidth:72,justifyContent:'center',border:'2px solid #ef4444' }} onClick={() => handleCollDelete(item.id)}>
                                <i className="ti ti-trash" style={{ fontSize:15 }} />
                                <span style={{ fontSize:12,fontWeight:700 }}>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          </>
          )}

        </div>
      </main>

      {/* Modals */}
      {productModal && (
        <ProductModal
          product={productModal === 'new' ? null : productModal}
          onClose={() => setProductModal(null)}
          onSave={handleSaveProduct}
          showToast={showToast}
          customCategories={customCategories}
          onAddCategory={handleAddCategory}
        />
      )}
      {billPreview && <BillPreview bill={billPreview} onClose={() => setBillPreview(null)} />}
      {orderPreview && <OrderPreview order={orderPreview} onClose={() => setOrderPreview(null)} />}
      </div>
  );
}
