import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/products';
import { getCollection } from '../api/collections';
import { getOrders } from '../api/orders';
import { getNotificationsForUser, markAllNotificationsRead } from '../api/notifications';
import FireworksCanvas from '../components/FireworksCanvas';

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

function writeCartCookie(items) {
  const value = encodeURIComponent(JSON.stringify(items || {}));
  document.cookie = `${CART_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

function useHeroSparkles(heroRef) {
  useEffect(() => {
    const hero = heroRef.current; if (!hero) return;
    let running = true;
    function spawn() {
      if (!running) return;
      const s = document.createElement('span');
      const colors = ['#FFD700','#FF69B4','#00CFFF','#ADFF2F','#FF4500','#fff','#EA80FC'];
      const color = colors[Math.floor(Math.random()*colors.length)];
      const sz = Math.random()*10+6, dur = Math.random()*1200+600;
      s.style.cssText=`position:absolute;left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;pointer-events:none;z-index:2;animation:sparkle-pop ${dur}ms ease-out forwards;background:${color};border-radius:50%;box-shadow:0 0 ${sz*2}px ${color},0 0 ${sz}px #fff;`;
      hero.appendChild(s);
      setTimeout(()=>{ if(s.parentNode) s.parentNode.removeChild(s); }, dur+100);
      if (running) setTimeout(spawn, Math.random()*120+40);
    }
    spawn();
    return ()=>{ running=false; };
  }, [heroRef]);
}

const NAV_ITEMS = [
  { key:'home',     label:'Home' },
  { key:'products', label:'All Products' },
  { key:'giftbox',  label:'Gift Boxes' },
  { key:'combos',   label:'Combos' },
  { key:'new',      label:'New Arrivals', badge:'NEW' },
  { key:'offers',   label:'Offers' },
  { key:'safety',   label:'Safety Tips' },
  { key:'about',    label:'About Us' },
  { key:'contact',  label:'Contact Us' },
  { key:'myorders', label:'My Orders' },
];

const PRODUCT_CATS = ['All Products','Rockets','Fountains','Flower Pots','Wheels','Bombettes'];

export default function UserDashboard({ user=null, onLogout, showToast }) {
  const navigate = useNavigate();
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [cart,       setCart]       = useState({});
  const [qty,        setQty]        = useState({});
  const [section,    setSection]    = useState('home');
  const [cat,        setCat]        = useState('All Products');
  const [search,     setSearch]     = useState('');
  const [cartOpen,   setCartOpen]   = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [collections,setCollections]= useState({ giftbox:[], combo:[], new_arrivals:[], offers:[] });
  const [notifs,     setNotifs]     = useState([]);
  const [shipBanner, setShipBanner] = useState(null);
  const [myOrders,   setMyOrders]   = useState([]);
  const [contactForm,setContactForm]= useState({ name:'',phone:'',email:'',subject:'',message:'' });
  const [menuOpen,   setMenuOpen]   = useState(false);
  // track which hamburger nav item is expanded (for sub-category)
  const [drawerExpanded, setDrawerExpanded] = useState(false);

  const heroRef = useRef(null);
  useHeroSparkles(heroRef);

  const unreadCount = notifs.filter(n=>!n.read).length;

  const refreshNotifs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await getNotificationsForUser(user.id);
      setNotifs(list);
      setShipBanner(list.find(n=>n.type==='shipping'&&!n.read)||null);
    } catch {}
  }, [user?.id]);

  const refreshMyOrders = useCallback(async () => {
    if (!user?.id) {
      setMyOrders([]);
      return;
    }
    try {
      const orders = await getOrders();
      setMyOrders(orders.filter((order) => String(order.userId) === String(user.id)));
    } catch {}
  }, [user?.id]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getProducts();
      setProducts(p);
      const init={};
      p.forEach(x=>{ init[x.id]=1; });
      setQty(init);
    } catch { showToast('Could not load products'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
    getCollection('giftbox').then(d=>setCollections(p=>({...p,giftbox:d}))).catch(()=>{});
    getCollection('combo').then(d=>setCollections(p=>({...p,combo:d}))).catch(()=>{});
    getCollection('new_arrivals').then(d=>setCollections(p=>({...p,new_arrivals:d}))).catch(()=>{});
    getCollection('offers').then(d=>setCollections(p=>({...p,offers:d}))).catch(()=>{});
    setCart(readCartCookie());
    refreshNotifs();
    refreshMyOrders();
  }, [loadProducts, refreshMyOrders, refreshNotifs, user?.id]);

  useEffect(() => {
    const t = setInterval(refreshNotifs, 4000);
    return ()=>clearInterval(t);
  }, [refreshNotifs]);

  const allItems = [...products, ...collections.giftbox, ...collections.combo, ...collections.new_arrivals, ...collections.offers];
  const productCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const productsByCategory = productCategories.map(category => ({
    category,
    items: products.filter(p => p.category === category),
  }));

  const saveCart = (c) => {
    setCart(c);
    writeCartCookie(c);
  };

  const addToCart = p => {
    const q = qty[p.id]||1;
    if (p.stock===0){ showToast('Out of stock!'); return; }
    if (q>p.stock){ showToast(`Only ${p.stock} in stock!`); return; }
    const prev = cart[p.id]||0;
    if (prev+q>p.stock){ showToast(`Cannot add more than ${p.stock}`); return; }
    saveCart({...cart,[p.id]:prev+q});
    // showToast(`${p.name} x${q} added! 🛒`);
    setQty(x=>({...x,[p.id]:1}));
  };

  const updateCart = (id, delta) => {
    const p = allItems.find(x=>String(x.id)===String(id));
    const nv = (cart[id]||0)+delta;
    if (nv<=0){ const c={...cart}; delete c[id]; saveCart(c); }
    else if (p&&nv>p.stock) showToast(`Max ${p.stock} available`);
    else saveCart({...cart,[id]:nv});
  };

  const cartTotal  = ()=>Object.entries(cart).reduce((s,[id,q])=>{ const p=allItems.find(x=>String(x.id)===String(id)); return s+(p?p.price*q:0); },0);
  const cartCount  = ()=>Object.values(cart).reduce((a,b)=>a+b,0);
  const cartItems  = Object.entries(cart).filter(([,q])=>q>0).map(([id,q])=>{ const p=allItems.find(x=>String(x.id)===String(id)); return p?{...p,cartQty:q}:null; }).filter(Boolean);
  const shipping   = ()=>cartTotal()>=1000?0:50;
  const filtered = products
    .filter(p=>cat==='All Products'||p.category===cat)
    .filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||(p.category||'').toLowerCase().includes(search.toLowerCase()));

  const stockLabel = (s, th=10) => s===0?['out','Out of Stock']:s<=th?['low',`Only ${s} left`]:['ok',`${s} in stock`];

  function navTo(key) {
    setSection(key);
    if (key==='products') setCat('All Products');
    setCartOpen(false); setNotifOpen(false); setMenuOpen(false);
  }

  function openCart()  { setCartOpen(true);  setNotifOpen(false); }
  function openNotif() { setNotifOpen(true);  setCartOpen(false); }
  function closeCart() { setCartOpen(false); }
  function closeNotif(){ setNotifOpen(false); }

  /* Product card */
  const ProductCard = ({ p }) => {
    const [sc,sl] = stockLabel(p.stock, p.lowStockThreshold);
    const disc = p.mrp>p.price?Math.round(((p.mrp-p.price)/p.mrp)*100):0;
    const isOut = p.stock===0;
    return (
      <div className={`pcard${isOut?' is-out':''}`}>
        <div className="imgwrap" style={{background:'linear-gradient(135deg,#fff8e0,#fff5f0)'}}>
          {p.image ? (
            <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'12px 12px 0 0' }} />
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(29,31,77,0.24)', fontSize:42 }}>
              <i className="ti ti-sparkles" />
            </div>
          )}
          {disc>0&&<div className="off">{disc}% OFF</div>}
          <div className={"stk "+sc}>{sl}</div>
          {isOut&&<div className="out-overlay"><span className="out-ribbon">Out of Stock</span></div>}
        </div>
        <div className="body">
          <div className="pname">{p.name}</div>
          <div className="pdesc">{p.desc}</div>
          <div className="pprices"><span className="pmrp">₹{p.mrp}</span><span className="pprice">₹{p.price}</span></div>
          <div className="controls">
            <div className="qty-box">
              <button disabled={isOut} onClick={()=>setQty(x=>({...x,[p.id]:Math.max(1,(x[p.id]||1)-1)}))}>−</button>
              <span>{qty[p.id]||1}</span>
              <button disabled={isOut} onClick={()=>setQty(x=>({...x,[p.id]:Math.min(p.stock,(x[p.id]||1)+1)}))}>+</button>
            </div>
            <button type="button" className="add-cart-btn" disabled={isOut} onClick={()=>addToCart(p)}>
              {isOut?<><i className="ti ti-ban"/> Out of Stock</>:<><i className="ti ti-shopping-cart-plus"/> Add</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{position:'relative',minHeight:'100vh'}}>
      <FireworksCanvas/>
      <div style={{position:'relative',zIndex:1}}>

        {/* ── HEADER ── */}
        <header className="site-header">
          <div className="logo-wrap" style={{cursor:'pointer'}} onClick={()=>navTo('home')}>
            <i className="ti ti-sparkles licon"/>
            <div><h1><div className="lname">Sri Murugan <span>Crackers</span></div></h1><div className="ltag">Premium Quality</div></div>
          </div>
          <div className="search-wrap">
            <div className="search-inner">
              <span className="search-prefix-icon" style={{fontSize:16,lineHeight:1}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&navTo('products')} placeholder="Search crackers..."/>
              {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#999',padding:'0 4px',lineHeight:1}}>✕</button>}
            </div>
            <button onClick={()=>navTo('products')} className="search-go-btn">Search</button>
          </div>
          <div className="header-actions">
            {/* ALERTS */}
            <button className="haction notif-haction" onClick={openNotif} style={{background:'none',border:'none',position:'relative'}}>
              <span style={{position:'relative',display:'inline-block',fontSize:22,lineHeight:1}}>
                🔔
                {unreadCount>0&&<span className="notif-pulse-dot"/>}
              </span>
              {unreadCount>0&&<span className="badge" style={{background:'var(--red)'}}>{unreadCount}</span>}
              <span>Alerts</span>
            </button>

            <button className="haction" onClick={()=>navTo('myorders')} style={{background:'none',border:'none'}}>
              <i className="ti ti-package"/><span>Orders</span>
            </button>
            {user
              ? <button className="haction" onClick={()=>{onLogout();navigate('/');}} style={{background:'none',border:'none'}}><i className="ti ti-logout"/><span>Logout</span></button>
              : <button className="haction" onClick={()=>navigate('/login')} style={{background:'none',border:'none'}}><i className="ti ti-login"/><span>Login</span></button>
            }
          </div>
        </header>

        {/* ── SHIPPED BANNER ── */}
        {shipBanner&&(
          <div style={{background:'linear-gradient(135deg,#0f6e56,#1a8754)',color:'#fff',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,borderBottom:'2px solid var(--gold)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <i className="ti ti-truck-delivery" style={{fontSize:26}}/>
              <div><strong style={{display:'block',fontSize:14}}>🚚 Order Shipped!</strong><span style={{fontSize:12,opacity:.9}}>{shipBanner.message||shipBanner.msg||'Your order is on the way!'}</span></div>
            </div>
            <button onClick={async()=>{if(user?.id)await markAllNotificationsRead(user.id);setShipBanner(null);refreshNotifs();}}
              style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        )}

        {/* ── DESKTOP NAVBAR ── */}
        <nav className="navbar user-desktop-nav">
          {NAV_ITEMS.map(item=>(
            <span key={item.key} className={section===item.key?'active':''} onClick={()=>navTo(item.key)}>
              {item.label}
              {item.badge&&<span style={{display:'inline-block',background:'#10b981',color:'#fff',fontSize:'9px',fontWeight:800,padding:'2px 6px',borderRadius:10,marginLeft:5,verticalAlign:'middle'}}>{item.badge}</span>}
            </span>
          ))}
        </nav>



        {/* ── MOBILE NAV BAR ── */}
        <div className="user-mobile-nav-bar" style={{visibility: cartOpen||notifOpen ? 'hidden' : 'visible'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:'#cfd0e6',fontSize:13,fontWeight:700}}>
              {NAV_ITEMS.find(i=>i.key===section)?.label||'Menu'}
            </span>
            {/* Show cat pill in mobile bar when on products */}
            {section==='products'&&cat!=='All Products'&&(
              <span style={{background:'var(--gold)',color:'var(--gold-dark)',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:12}}>{cat}</span>
            )}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {/* ── ALERT BELL — always visible on mobile ── */}
            <button onClick={openNotif} className={`mobile-bell-btn${unreadCount>0?' has-notif':''}`} aria-label="Notifications">
              <span style={{position:'relative',display:'inline-flex',alignItems:'center',fontSize:22}}>
                🔔
                {unreadCount>0 && <span className="bell-pulse"/>}
              </span>
              {unreadCount>0 && <span className="mobile-bell-badge">{unreadCount}</span>}
            </button>
            <button className="user-hamburger-btn" onClick={()=>setMenuOpen(o=>!o)} aria-label="Toggle menu">
              <span/><span/><span/>
            </button>
          </div>
        </div>

        {/* ── MOBILE DRAWER OVERLAY ── */}
        {menuOpen&&<div className="user-drawer-overlay" onClick={()=>setMenuOpen(false)}/>}

        {/* ── MOBILE SIDE DRAWER ── */}
        <div className={`user-side-drawer${menuOpen?' open':''}`}>
          <div className="user-drawer-header">
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <i className="ti ti-sparkles" style={{fontSize:22,color:'var(--gold)'}}/>
              <div>
                <div style={{color:'var(--gold)',fontWeight:900,fontSize:15}}>Sri Murugan Crackers</div>
                {user&&<div style={{color:'#cfd0e6',fontSize:11,marginTop:1}}>👤 {user.name}</div>}
              </div>
            </div>
            <button onClick={()=>setMenuOpen(false)} style={{background:'none',border:'none',color:'#fff',fontSize:22,cursor:'pointer',lineHeight:1,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          <nav className="user-drawer-nav">
            {NAV_ITEMS.map(item=>(
              <React.Fragment key={item.key}>
                <div
                  className={`user-drawer-item${section===item.key?' active':''}`}
                  onClick={()=> item.key==='products' ? (setDrawerExpanded(e=>!e), setSection('products'), setMenuOpen(false)) : navTo(item.key)}
                >
                  <span>{item.label}</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {item.badge&&<span style={{background:'#10b981',color:'#fff',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:20}}>{item.badge}</span>}
                    {item.key==='products'&&<span style={{color:'#9a9bc4',fontSize:12}}>{drawerExpanded?'▲':'▼'}</span>}
                  </div>
                </div>
                {/* Sub-categories under All Products */}
                {item.key==='products'&&drawerExpanded&&(
                  <div style={{background:'rgba(255,255,255,0.04)',borderLeft:'3px solid var(--gold)',marginLeft:16,marginBottom:4}}>
                    {PRODUCT_CATS.map(c=>(
                      <div key={c}
                        onClick={()=>{ setCat(c); setSection('products'); setMenuOpen(false); }}
                        style={{
                          padding:'10px 16px',fontSize:13,cursor:'pointer',
                          color:cat===c?'var(--gold)':'#cfd0e6',
                          fontWeight:cat===c?700:400,
                          background:cat===c?'rgba(250,199,117,0.08)':'transparent',
                          borderBottom:'1px solid rgba(255,255,255,0.05)',
                        }}>
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </nav>
          <div className="user-drawer-footer">
            {user
              ? <button onClick={()=>{onLogout();navigate('/');setMenuOpen(false);}} style={{width:'100%',padding:11,background:'#e53e3e',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer'}}><i className="ti ti-logout" style={{marginRight:6}}/>Logout</button>
              : <button onClick={()=>{navigate('/login');setMenuOpen(false);}} style={{width:'100%',padding:11,background:'var(--gold)',color:'var(--gold-dark)',border:'none',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer'}}><i className="ti ti-login" style={{marginRight:6}}/>Login / Register</button>
            }
          </div>
        </div>

        {/* ══ HOME ══ */}
        {section==='home'&&(<>
          <div ref={heroRef} className="hero-banner" style={{position:'relative',overflow:'hidden',minHeight:320,display:'flex',alignItems:'center',gap:24,flexWrap:'wrap',padding:'40px 24px'}}>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(29,31,77,0.92),rgba(42,31,94,0.85),rgba(10,5,32,0.70))',zIndex:1}}/>
            <img src="/fireworks.jpg" alt="Fireworks" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'brightness(0.85)',zIndex:0}}/>
            <div className="hero-text" style={{position:'relative',zIndex:3,flex:'1 1 300px'}}>
              <div className="ht1">{user?`Welcome, ${user.name}! 👋`:'Welcome to Sri Murugan Crackers! 👋'}</div>
              <h1 className="ht2">Sri Murugan Crackers</h1>
              <div className="ht3">Premium fireworks delivered to your door</div>
              <div className="ht1">Name : D.Raguram</div>
              <div className="ht1">Mobile no : +91 7397635583 <br/>Or     +91 9342635583</div><br/>
              <span className="hero-badge">🎆 Festival Season Sale!</span>
              <div className="hero-stats">
                <div><i className="ti ti-truck"/>Free delivery above ₹1000</div>
                <div><i className="ti ti-shield-check"/>100% Genuine products</div>
                <div><i className="ti ti-star"/>4.9★ Rating</div>
              </div>
              <div style={{display:'flex',gap:12,marginTop:20,flexWrap:'wrap'}}>
                <button type="button" className="shop-now-btn" onClick={()=>navTo('products')}>🛒 Shop Now</button>
                <button type="button" onClick={()=>navTo('offers')} style={{background:'var(--pink)',color:'#fff',border:'none',padding:'12px 24px',borderRadius:10,fontWeight:700,fontSize:14}}>🔥 See Offers</button>
              </div>
            </div>
            <div style={{position:'relative',zIndex:3,flex:'0 0 auto',textAlign:'center'}}>
              <img src="/fireworks.jpg" alt="Fireworks display" style={{width:220,height:220,objectFit:'cover',borderRadius:16,border:'3px solid rgba(250,199,117,0.5)',boxShadow:'0 8px 32px rgba(250,199,117,0.25)'}}/>
            </div>
          </div>

          {/* Category Quick Links */}
          <div className="cat-quick">
            {[
              {label:'Rockets',  action:()=>{navTo('products');setCat('Rockets');}},
              {label:'Fountains',action:()=>{navTo('products');setCat('Fountains');}},
              {label:'Flower Pots',action:()=>{navTo('products');setCat('Flower Pots');}},
              {label:'Wheels',   action:()=>{navTo('products');setCat('Wheels');}},
              {label:'Bombettes',action:()=>{navTo('products');setCat('Bombettes');}},
              {label:'Gift Boxes',action:()=>navTo('giftbox')},
              {label:'Combos',   action:()=>navTo('combos')},
              {label:'Offers',   action:()=>navTo('offers')},
            ].map(c=>(
              <div key={c.label} onClick={c.action} style={{textAlign:'center',minWidth:64,cursor:'pointer',flexShrink:0}}>
                <div style={{fontSize:12,marginTop:4,fontWeight:700,color:'var(--navy)',padding:'8px 12px',background:'#f0f0f8',borderRadius:8,whiteSpace:'nowrap'}}>{c.label}</div>
              </div>
            ))}
          </div>

          <div className="products-section">
            <div className="sec-head">
              <h3>🔥 Best Selling Products</h3>
              <span style={{fontSize:13,color:'var(--red)',fontWeight:600,cursor:'pointer'}} onClick={()=>navTo('products')}>View all →</span>
            </div>
            {loading?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Loading...</div>
            :<div className="products-grid">{products.slice(0,8).map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>

          <div className="products-section">
            {loading ? <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Loading...</div> : productsByCategory.map(group => (
              <div key={group.category} style={{marginBottom:22}}>
                <div className="sec-head" style={{marginBottom:12}}>
                  <h3 style={{fontSize:18}}>{group.category}</h3>
                  <span style={{fontSize:13,color:'var(--muted)'}}>{group.items.length} products</span>
                </div>
                <div className="products-grid">
                  {group.items.map(p => <ProductCard key={p.id} p={p} />)}
                </div>
              </div>
            ))}
          </div>

          <div className="products-section">
            <div className="sec-head"><h3>🎁 Gift Boxes</h3></div>
            {collections.giftbox.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>🎁</div><div>Gift boxes coming soon!</div></div>
              :<div className="products-grid">{collections.giftbox.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>

          <div className="products-section">
            <div className="sec-head"><h3>📦 Combo Packs</h3></div>
            {collections.combo.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>📦</div><div>Combo packs coming soon!</div></div>
              :<div className="products-grid">{collections.combo.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>

          <div className="products-section">
              <div><h2 style={{fontSize:20,marginBottom:4}}>✨ New Arrivals</h2></div>
            {collections.new_arrivals.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>✨</div><div>New arrivals coming soon!</div></div>
              :<div className="products-grid">{collections.new_arrivals.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>

          <div className="products-section">
            <div className="sec-head"><h3>All Offers</h3></div>
            {collections.offers.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>🏷️</div><div>Offers coming soon!</div></div>
              :<div className="products-grid">{collections.offers.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>

          <div style={{margin:'0 16px 24px',background:'linear-gradient(135deg,#1d1f4d,#6b21a8)',borderRadius:12,padding:24,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <h2 style={{color:'var(--gold)',fontSize:20,marginBottom:6}}>🎆 Diwali Mega Sale!</h2>
              <p style={{color:'#d0d0ff',fontSize:13}}>Limited time offers — grab before they're gone!</p>
              <button onClick={()=>navTo('offers')} style={{marginTop:10,background:'var(--gold)',color:'var(--gold-dark)',border:'none',padding:'9px 20px',borderRadius:8,fontWeight:700,fontSize:13}}>Shop Offers →</button>
            </div>
            <div style={{background:'var(--pink)',color:'#fff',fontSize:24,fontWeight:900,padding:'14px 20px',borderRadius:12,textAlign:'center'}}>UP TO<br/>50% OFF</div>
          </div>
        </>)}

        {/* ══ ALL PRODUCTS ══ */}
        {section==='products'&&(
          <div>
            {/* Mobile category scroll (hidden on desktop, desktop uses the sub-nav above) */}
            <div className="cat-scroll-bar" style={{display:'flex',overflowX:'auto',padding:'8px 12px',gap:8,background:'#fff',borderBottom:'1px solid var(--border)'}}>
              {PRODUCT_CATS.map(c=>(
                <button key={c} onClick={()=>setCat(c)} style={{
                  padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',flexShrink:0,
                  background:cat===c?'var(--navy)':'#f0f0f8',color:cat===c?'var(--gold)':'var(--navy)',
                  fontWeight:700,fontSize:12,whiteSpace:'nowrap'
                }}>{c}</button>
              ))}
            </div>
            <div className="products-section">
              <div className="sec-head">
                <h3>{cat}{search&&` — "${search}"`}</h3>
                <span style={{fontSize:13,color:'var(--muted)'}}>{filtered.length} products</span>
              </div>
              {loading?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Loading...</div>
              :filtered.length===0?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>No products found</div>
              :<div className="products-grid">{filtered.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
            </div>
          </div>
        )}

        {/* ══ GIFT BOXES ══ */}
        {section==='giftbox'&&(
          <div className="products-section">
            <div className="sec-head"><h3>🎁 Gift Boxes</h3><span style={{fontSize:13,color:'var(--muted)'}}>Curated gift collections</span></div>
            {collections.giftbox.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>🎁</div><div>Gift boxes coming soon!</div></div>
              :<div className="products-grid">{collections.giftbox.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>
        )}

        {/* ══ COMBOS ══ */}
        {section==='combos'&&(
          <div className="products-section">
            <div className="sec-head"><h3>📦 Combo Packs</h3><span style={{fontSize:13,color:'var(--muted)'}}>Save more with combos</span></div>
            {collections.combo.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>📦</div><div>Combo packs coming soon!</div></div>
              :<div className="products-grid">{collections.combo.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>
        )}

        {/* ══ NEW ARRIVALS ══ */}
        {section==='new'&&(
          <div className="products-section">
            <div style={{background:'linear-gradient(135deg,var(--navy),#6b21a8)',borderRadius:12,padding:'20px 24px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
              <div><h2 style={{color:'var(--gold)',fontSize:20,marginBottom:4}}>✨ New Arrivals</h2><p style={{color:'#d0d0ff',fontSize:13}}>Fresh stock — be the first to celebrate!</p></div>
              <span style={{background:'#10b981',color:'#fff',fontWeight:800,fontSize:13,padding:'6px 16px',borderRadius:20}}>JUST IN</span>
            </div>
            {collections.new_arrivals.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>✨</div><div>New arrivals coming soon!</div></div>
              :<div className="products-grid">{collections.new_arrivals.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>
        )}

        {/* ══ OFFERS ══ */}
        {section==='offers'&&(
          <div className="products-section">
            <div style={{background:'linear-gradient(135deg,#1d1f4d,#6b21a8)',borderRadius:12,padding:24,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div><h2 style={{color:'var(--gold)',fontSize:22,marginBottom:6}}>🎆 Diwali Mega Sale!</h2><p style={{color:'#d0d0ff',fontSize:14}}>Limited time offers — grab before they're gone!</p></div>
              <div style={{background:'var(--pink)',color:'#fff',fontSize:26,fontWeight:900,padding:'16px 22px',borderRadius:12,textAlign:'center'}}>UP TO<br/>50% OFF</div>
            </div>
            <div className="sec-head"><h3>All Offers</h3></div>
            {collections.offers.length===0
              ?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><div style={{fontSize:40,marginBottom:8}}>🏷️</div><div>Offers coming soon!</div></div>
              :<div className="products-grid">{collections.offers.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
          </div>
        )}

        {/* ══ SAFETY ══ */}
        {section==='safety'&&(
          <div style={{background:'#fff',padding:'28px 24px'}}>
            <div className="sec-head"><h3><i className="ti ti-shield-check" style={{color:'var(--gold)',marginRight:6}}/>Safety Tips</h3></div>
            <div style={{background:'#fff0f0',border:'1px solid #ffb3b3',borderRadius:10,padding:'14px 18px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
              <i className="ti ti-alert-triangle" style={{fontSize:24,color:'var(--red)',flexShrink:0,marginTop:2}}/>
              <div><strong>Important:</strong> Burst crackers only in open areas. Keep water nearby. Children must have adult supervision.</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20}}>
              {[
                {icon:'ti-user-check',h:'Adult Supervision',p:'Children below 15 should never handle crackers without supervision.'},
                {icon:'ti-shirt',h:'Wear Cotton Clothes',p:'Avoid synthetic clothing as it catches fire easily.'},
                {icon:'ti-map-2',h:'Use Open Spaces',p:'Burst crackers away from buildings, vehicles, and trees.'},
                {icon:'ti-droplet',h:'Keep Water Ready',p:'Soak used crackers in water before disposal.'},
                {icon:'ti-eye',h:'Eye Protection',p:'Never lean over a cracker while lighting it.'},
                {icon:'ti-first-aid-kit',h:'First Aid Ready',p:'In case of burns, cool with running water immediately.'},
                {icon:'ti-clock',h:'Permitted Hours Only',p:'Burst crackers only during 8 PM – 10 PM on Diwali.'},
                {icon:'ti-flame-off',h:'Never Re-ignite',p:'If a cracker fails, wait 15 minutes and douse with water.'},
              ].map(s=>(
                <div key={s.h} style={{background:'linear-gradient(135deg,#fff8f0,#fff)',border:'1px solid #ffd580',borderRadius:12,padding:20}}>
                  <div style={{fontSize:32,color:'var(--gold)',marginBottom:10}}><i className={`ti ${s.icon}`}/></div>
                  <h4 style={{fontSize:14,fontWeight:700,color:'var(--navy)',marginBottom:6}}>{s.h}</h4>
                  <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6}}>{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ ABOUT ══ */}
        {section==='about'&&(
          <div style={{background:'#fff',padding:'28px 24px'}}>
            <div style={{background:'linear-gradient(135deg,var(--navy),#6b21a8)',borderRadius:16,padding:32,color:'#fff',marginBottom:24,textAlign:'center',position:'relative',overflow:'hidden'}}>
              <img src="/fireworks.jpg" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.2}}/>
              <div style={{position:'relative',zIndex:1}}>
                <h1 style={{color:'var(--gold)',fontSize:28,marginBottom:8}}>🎆 About Sri Murugan Crackers</h1>
                <p style={{color:'#d0d0ff',fontSize:14,lineHeight:1.7,maxWidth:600,margin:'0 auto'}}>We are a trusted name in the fireworks industry, bringing you the finest quality crackers from the cracker capital of India — Sivakasi, Tamil Nadu.</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:16,marginBottom:24}}>
              {[['25+','Years Experience'],['500+','Products'],['50K+','Happy Customers'],['100%','Genuine']].map(([n,l])=>(
                <div key={l} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:20,textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:900,color:'var(--red)'}}>{n}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20}}>
              {[
                {icon:'ti-certificate',h:'100% Genuine Products',p:'Sourced directly from licensed manufacturers in Sivakasi.'},
                {icon:'ti-truck-delivery',h:'Safe Doorstep Delivery',p:'Special fire-resistant packaging for safe delivery.'},
                {icon:'ti-currency-rupee',h:'Factory Direct Prices',p:'No middlemen — savings passed directly to you.'},
                {icon:'ti-headset',h:'24/7 Customer Support',p:'Available all day during the festive season.'},
              ].map(s=>(
                <div key={s.h} style={{background:'linear-gradient(135deg,#fff8f0,#fff)',border:'1px solid #ffd580',borderRadius:12,padding:20}}>
                  <div style={{fontSize:32,color:'var(--gold)',marginBottom:10}}><i className={`ti ${s.icon}`}/></div>
                  <h4 style={{fontSize:14,fontWeight:700,color:'var(--navy)',marginBottom:6}}>{s.h}</h4>
                  <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6}}>{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CONTACT ══ */}
        {section==='contact'&&(
          <div style={{background:'#fff',padding:'28px 24px'}}>
            <div className="sec-head"><h3><i className="ti ti-phone" style={{color:'var(--gold)',marginRight:6}}/>Contact Us</h3></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:24,marginTop:16}}>
              <div style={{background:'#f8f8ff',border:'1px solid var(--border)',borderRadius:12,padding:20}}>
                <h4 style={{fontSize:15,fontWeight:700,color:'var(--navy)',marginBottom:14}}>Get in Touch</h4>
                {[['ti-map-pin','Address: 3/267 D, Raamji crackers shop,Chinnakamanpatti, sattur road, Sivakasi - 626123'],['ti-phone','+91  73976 35583 or +91 93426 35583'],['ti-mail','srimuruganmcrackers.sivakasi@gamil.com'],['ti-brand-whatsapp','WhatsApp: +91 73976 35583']].map(([icon,text])=>(
                  <div key={text} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:12,fontSize:13}}>
                    <i className={`ti ${icon}`} style={{fontSize:20,color:'var(--gold)',flexShrink:0,marginTop:1}}/><span>{text}</span>
                  </div>
                ))}
              </div>
              <div style={{background:'#f8f8ff',border:'1px solid var(--border)',borderRadius:12,padding:20}}>
                <h4 style={{fontSize:15,fontWeight:700,color:'var(--navy)',marginBottom:14}}>Send a Message</h4>
                {[{key:'name',label:'Full name *',type:'text',ph:'Murugan Kumar'},{key:'phone',label:'Mobile *',type:'tel',ph:'9876543210'},{key:'email',label:'Email',type:'email',ph:'email@example.com'}].map(f=>(
                  <div key={f.key} style={{marginBottom:10}}>
                    <label style={{display:'block',fontSize:11,color:'var(--muted)',marginBottom:4}}>{f.label}</label>
                    <input type={f.type} value={contactForm[f.key]} onChange={e=>setContactForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{width:'100%',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:14}}/>
                  </div>
                ))}
                <textarea value={contactForm.message} onChange={e=>setContactForm(p=>({...p,message:e.target.value}))} placeholder="Your message..."
                  style={{width:'100%',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:14,height:90,resize:'vertical',fontFamily:'inherit',marginBottom:10}}/>
                <button onClick={()=>{ if(!contactForm.name||!contactForm.phone||!contactForm.message){showToast('Fill required fields');return;} showToast('Message sent! 📞'); setContactForm({name:'',phone:'',email:'',subject:'',message:''}); }}
                  style={{width:'100%',background:'var(--navy)',color:'var(--gold)',border:'none',padding:'12px',borderRadius:8,fontWeight:700,fontSize:14}}>
                  <i className="ti ti-send" style={{marginRight:6}}/>Send Message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MY ORDERS ══ */}
        {section==='myorders'&&(
          <div style={{background:'#fff',padding:'28px 24px'}}>
            {!user
              ?<div style={{textAlign:'center',padding:60}}>
                <div style={{fontSize:48,marginBottom:12}}>🔒</div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--navy)',marginBottom:8}}>Login to view your orders</div>
                <button onClick={()=>navigate('/login')} style={{background:'var(--red)',color:'#fff',border:'none',padding:'12px 28px',borderRadius:10,fontWeight:700,fontSize:14}}>🔐 Login / Register</button>
              </div>
              :<>
                <div className="sec-head"><h3><i className="ti ti-package" style={{color:'var(--gold)',marginRight:6}}/>My Orders</h3></div>
                {myOrders.length===0
                  ?<div style={{textAlign:'center',padding:60,color:'var(--muted)'}}><div style={{fontSize:48,marginBottom:12}}>📦</div><div>No orders yet!</div><button onClick={()=>navTo('products')} style={{marginTop:16,background:'var(--red)',color:'#fff',border:'none',padding:'12px 28px',borderRadius:10,fontWeight:700,fontSize:14}}>🛒 Shop Now</button></div>
                  :[...myOrders].reverse().map((o,i)=>(
                    <div key={i} style={{border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',marginBottom:12,background:'#fafafa'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <span style={{fontWeight:700,fontSize:13,color:'var(--navy)'}}>{o.id||`Order #${i+1}`}</span>
                        <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:o.status==='Shipped'?'#e1f5ee':o.status==='Delivered'?'#e8f5e9':'#fff4e0',color:o.status==='Shipped'?'#0f6e56':o.status==='Delivered'?'#1b5e20':'#a36a00'}}>{o.status||'Pending'}</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>{o.items?.map(it=>`${it.name} × ${it.qty}`).join(' | ')}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:14,fontWeight:700,color:'var(--red)'}}>₹{o.total}</span>
                        <span style={{fontSize:11,color:'var(--muted)'}}>{o.date||new Date().toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  ))
                }
              </>
            }
          </div>
        )}

        {/* ══ CART DRAWER ══ */}
        {cartOpen&&<div className="overlay" onClick={closeCart}/>}
        <div className={`cart-drawer${cartOpen?' open':''}`}>
          <div className="cart-head">
            <h3>🛒 My Cart ({cartCount()} items)</h3>
            <button type="button" onClick={closeCart} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
          </div>
          <div className="cart-items">
            {cartItems.length===0
              ?<div className="empty-cart"><div style={{fontSize:40,marginBottom:8}}>🛒</div><div>Your cart is empty</div></div>
              :cartItems.map(item=>(
                <div className="cart-row" key={item.id}>
                  <div className="cinfo">
                    <div className="cname">{item.name}</div>
                    <div className="cprice">₹{item.price} × {item.cartQty} = ₹{(item.price*item.cartQty).toFixed(0)}</div>
                  </div>
                  <div className="cqty">
                    <button type="button" onClick={()=>updateCart(item.id,-1)}>−</button>
                    <span>{item.cartQty}</span>
                    <button type="button" onClick={()=>updateCart(item.id,1)}>+</button>
                  </div>
                  <button type="button" className="cremove" onClick={()=>{const c={...cart};delete c[item.id];saveCart(c);}}>✕</button>
                </div>
              ))
            }
          </div>
          {cartItems.length>0&&(
            <div className="cart-footer">
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,padding:8,background:'#f8f8ff',borderRadius:6}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><span>₹{cartTotal().toFixed(0)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Shipping</span><span>{shipping()===0?'🎉 FREE':'₹'+shipping()}</span></div>
                {shipping()>0&&<div style={{fontSize:10,color:'#10b981',marginTop:3}}>Add ₹{1000-cartTotal()} more for free shipping!</div>}
              </div>
              <div className="cart-total"><span>Total:</span><span>₹{(cartTotal()+shipping()).toFixed(0)}</span></div>
              <button type="button" className="checkout-btn" onClick={()=>{closeCart();if(!user){navigate('/login',{state:{from:'/checkout'}});showToast('Login to place your order 🔐');}else{navigate('/checkout');}}}>
                Proceed to Checkout →
              </button>
            </div>
          )}
        </div>

        {/* ══ NOTIFICATION DRAWER ══ */}
        {notifOpen&&<div className="overlay" onClick={closeNotif}/>}
        <div className={`cart-drawer${notifOpen?' open':''}`}>
          <div className="cart-head">
            <h3>🔔 Notifications {unreadCount>0&&<span style={{fontSize:12,background:'var(--red)',color:'#fff',padding:'1px 8px',borderRadius:12,marginLeft:6}}>{unreadCount} new</span>}</h3>
            <button type="button" onClick={closeNotif} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
          </div>
          <div className="cart-items">
            {notifs.length===0
              ?<div className="empty-cart" style={{padding:'40px 20px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                <div style={{fontSize:64,marginBottom:4,filter:'drop-shadow(0 0 16px rgba(250,199,117,0.6))'}}>🔔</div>
                <div style={{fontWeight:700,fontSize:16,color:'var(--navy)'}}>No Notifications Yet</div>
                <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,textAlign:'center'}}>When your order is shipped,<br/>an alert will appear here!</div>
                <div style={{display:'flex',gap:12,marginTop:12}}>
                  <span style={{fontSize:28}}>📦</span>
                  <span style={{fontSize:28}}>🚚</span>
                  <span style={{fontSize:28}}>✅</span>
                </div>
              </div>
              :notifs.map(n=>(
                <div key={n.id} style={{padding:'12px 0',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start'}}>
                  <div style={{fontSize:22,flexShrink:0}}>{n.type==='shipping'?'🚚':'🎉'}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:n.read?400:600,color:n.read?'var(--muted)':'var(--text)'}}>{n.message}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{new Date(n.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                  {!n.read&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--red)',flexShrink:0,marginTop:4}}/>}
                </div>
              ))
            }
          </div>
          {notifs.length>0&&(
            <div style={{padding:'12px 14px',borderTop:'1px solid var(--border)'}}>
              <button onClick={async()=>{if(user?.id)await markAllNotificationsRead(user.id);refreshNotifs();}} style={{width:'100%',padding:'9px',background:'var(--navy)',color:'var(--gold)',border:'none',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer'}}>
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* ── Floating Cart Button (FAB) ── */}
        {!cartOpen && (
          <button type="button" className="fab-cart" onClick={openCart} aria-label="Open cart">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="17" cy="20" r="1.5" fill="currentColor" stroke="none"/>
              <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6"/>
            </svg>
            {cartCount()>0 && <span className="fab-badge">{cartCount()}</span>}
          </button>
        )}

      </div>
    </div>
  );
}
