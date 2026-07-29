import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/products';
import { getCollection } from '../api/collections';
import { addOrder } from '../api/orders';

const CART_COOKIE = 'sc_cart';

function readCartCookie() {
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${CART_COOKIE}=`));
  if (!match) return {};
  try {
    return JSON.parse(decodeURIComponent(match.slice(CART_COOKIE.length + 1)));
  } catch {
    return {};
  }
}

function clearCartCookie() {
  document.cookie = `${CART_COOKIE}=; path=/; max-age=0`;
}

export default function CheckoutPage({ user, showToast }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState({ giftbox: [], combo: [], new_arrivals: [], offers: [] });
  const [cart, setCart] = useState({});
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ address: '', city: '', state: 'Tamil Nadu', pincode: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const saved = readCartCookie();
    if (!saved || !Object.keys(saved).length) { navigate('/dashboard'); return; }
    setCart(saved);
    getProducts().then(setProducts).catch(() => showToast('Could not load products'));
    getCollection('giftbox').then(d => setCollections(p => ({ ...p, giftbox: d }))).catch(() => {});
    getCollection('combo').then(d => setCollections(p => ({ ...p, combo: d }))).catch(() => {});
    getCollection('new_arrivals').then(d => setCollections(p => ({ ...p, new_arrivals: d }))).catch(() => {});
    getCollection('offers').then(d => setCollections(p => ({ ...p, offers: d }))).catch(() => {});
  }, [navigate, showToast]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  // Same combined lookup as the dashboard — cart items can come from the
  // main product catalog OR from Gift Box / Combo / New Arrivals, so
  // checkout has to be able to resolve both kinds of ids.
  const allItems = [
    ...products,
    ...collections.giftbox,
    ...collections.combo,
    ...collections.new_arrivals,
    ...collections.offers,
  ];

  const cartItems = Object.entries(cart).map(([id, q]) => {
    const p = allItems.find(x => String(x.id) === String(id));
    return p ? { ...p, cartQty: q } : null;
  }).filter(Boolean);

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.cartQty, 0);
  const delivery = subtotal >= 1000 ? 0 : 80;
  const total = subtotal + delivery;

  const validate = () => {
    const e = {};
    if (!form.address.trim()) e.address = 'Please enter your full address';
    if (!form.city.trim()) e.city = 'Required';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = '6-digit pincode required';
    setErrors(e); return !Object.keys(e).length;
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setProcessing(true);
    const orderItems = cartItems.map(i => ({
      productId: i.id,
      name: i.name,
      qty: i.cartQty,
      price: i.price,
      lineTotal: i.price * i.cartQty,
    }));
    try {
      const order = await addOrder({
        userId: user.id, userName: user.name, userPhone: user.phone,
        userEmail: user.email || '',
        customer: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email || '',
        },
        items: orderItems, subtotal, delivery, total,
        shippingAddress: { address: form.address, city: form.city, state: form.state, pincode: form.pincode },
      });
      clearCartCookie();
      navigate(`/order-success/${order.id}`);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
      <div style={{ fontSize: '48px' }}>🛒</div>
      <p>No items in cart. <button type="button" onClick={() => navigate('/dashboard')} style={{ color: 'var(--navy)', background: 'none', border: 'none', fontWeight: 700, fontSize: 14 }}>Shop now</button></p>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header className="site-header">
        <div className="logo-wrap">
          <i className="ti ti-sparkles licon" />
          <div><div className="lname">Sivakasi <span>Crackers</span></div></div>
        </div>
        <button type="button" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#cfd0e6', fontSize: 13, cursor: 'pointer' }}>
          ← Back to shop
        </button>
      </header>

      <div className="checkout-page">
        <h2>Checkout</h2>
        <div className="checkout-grid">
          <form onSubmit={placeOrder}>

            {/* Shipping Address */}
            <div className="checkout-card">
              <h3>🏠 Shipping Address</h3>

              {/* Full Address Textarea */}
              <label>Full Address</label>
              <textarea
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="House no, Street, Area, Landmark..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: 4,
                }}
              />
              {errors.address && <div className="field-err">{errors.address}</div>}

              <div className="form-row">
                <div>
                  <label>City</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
                  {errors.city && <div className="field-err">{errors.city}</div>}
                </div>
                <div>
                  <label>Pincode</label>
                  <input value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="600001" maxLength={6} inputMode="numeric" />
                  {errors.pincode && <div className="field-err">{errors.pincode}</div>}
                </div>
              </div>
              <label>State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)}>
                {['Tamil Nadu','Andhra Pradesh','Karnataka','Kerala','Maharashtra','Gujarat','Rajasthan'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Payment — Contact Admin */}
            <div className="checkout-card" style={{ background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', border: '1.5px solid var(--gold)', borderRadius: 14 }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: 14 }}>💰 Payment</h3>
              <div style={{ background: 'rgba(250,199,117,0.08)', border: '1px dashed var(--gold)', borderRadius: 12, padding: '18px 16px', marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📞</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Contact Admin to Complete Payment</div>
                <div style={{ color: '#cfd0e6', fontSize: 12, marginBottom: 16 }}>Place your order first, then contact us via phone or WhatsApp to pay.</div>
                <a href="tel:+919876543210" style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(250,199,117,0.3)',borderRadius:10,padding:'12px 16px',marginBottom:10,color:'#fff',textDecoration:'none' }}>
                  <i className="ti ti-phone" style={{ fontSize:20,color:'var(--gold)' }} />
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:11,color:'#aaa' }}>Call us</div>
                    <div style={{ fontWeight:700,fontSize:15,color:'var(--gold)' }}>+91 93426 35583</div>
                  </div>
                </a>
                <a href={`https://wa.me/917397635583?text=${encodeURIComponent(`Hi! I placed an order for ₹${total.toFixed(2)} on Sri Murugan Crackers. Please provide payment details.`)}`} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,background:'#25D366',borderRadius:10,padding:'12px 16px',color:'#fff',textDecoration:'none',fontWeight:700 }}>
                  <i className="ti ti-brand-whatsapp" style={{ fontSize:22 }} />
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:11,opacity:.85 }}>Chat on WhatsApp</div>
                    <div style={{ fontSize:15 }}>+91 73976 35583</div>
                  </div>
                </a>
              </div>
              <div style={{ background:'rgba(250,199,117,0.06)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#cfd0e6',lineHeight:1.7 }}>
                <strong style={{ color:'var(--gold)' }}>How it works:</strong><br />
                1️⃣ Fill address & click "Place Order"<br />
                2️⃣ Contact admin with your Order ID<br />
                3️⃣ Pay via UPI / Bank Transfer / Cash<br />
                4️⃣ Admin confirms & ships your order 🚚
              </div>
            </div>

            <button className="place-order-btn" type="submit" disabled={processing}>
              {processing ? '⏳ Placing Order...' : `Place Order — ₹${total.toFixed(2)}`}
            </button>
          </form>

          {/* Order Summary */}
          <div>
            <div className="checkout-card">
              <h3>🛒 Order Summary ({cartItems.length} items)</h3>
              {cartItems.map(i => (
                <div className="order-item" key={i.id}>
                  <div>
                    <div className="oname">{i.name}</div>
                    <div className="oqty">×{i.cartQty}</div>
                  </div>
                  <div className="oprice">₹{(i.price * i.cartQty).toFixed(0)}</div>
                </div>
              ))}
              <div className="price-breakdown" style={{ marginTop:'14px' }}>
                <div className="pb-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="pb-row"><span>Delivery</span><span>{delivery === 0 ? '🎉 FREE' : `₹${delivery}`}</span></div>
                {delivery > 0 && <div style={{ fontSize:'11px',color:'var(--muted)',textAlign:'right' }}>Add ₹{(1000 - subtotal).toFixed(0)} for free delivery</div>}
                <div className="pb-row pb-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
