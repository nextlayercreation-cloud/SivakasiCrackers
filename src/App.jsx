import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router, Routes, Route,
  Navigate, useNavigate, useLocation
} from 'react-router-dom';
import UserDashboard   from './pages/UserDashboard';
import AdminDashboard  from './pages/AdminDashboard';
import CheckoutPage    from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import FireworksCanvas from './components/FireworksCanvas';
import SearchableSelect from './components/SelectableSearch';
import { registerUser, loginUser, loginAdmin } from './api/auth';
import './styles/index.css';
import Logo from './components/Logo';

const stateOptions = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

const stateCityMap = {
  'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Rajahmundry','Tirupati','Kakinada','Anantapur','Nellore','Amaravati','Kurnool'],
  'Arunachal Pradesh': ['Itanagar','Naharlagun','Tawang','Bomdila','Pasighat','Ziro'],
  'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat','Tezpur','Nagaon','Bongaigaon'],
  'Bihar': ['Patna','Gaya','Bhagalpur','Muzaffarpur','Purnia','Darbhanga','Ara','Nalanda'],
  'Chhattisgarh': ['Raipur','Bilaspur','Durg','Bhilai','Korba','Rajnandgaon','Jagdalpur'],
  'Goa': ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Junagadh','Gandhinagar','Anand','Nadiad','Jamnagar'],
  'Haryana': ['Chandigarh','Faridabad','Gurugram','Panipat','Hisar','Sonipat','Rohtak','Karnal'],
  'Himachal Pradesh': ['Shimla','Manali','Dharamshala','Kullu','Solan','Mandi','Una'],
  'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Hazaribagh','Deoghar'],
  'Karnataka': ['Bengaluru','Mysuru','Mangaluru','Hubballi','Belagavi','Shimoga','Tumakuru','Davangere','Bagalkot','Ballari'],
  'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Kannur','Alappuzha','Palakkad','Malappuram'],
  'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Ratlam','Rewa','Satna','Chhindwara'],
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Thane','Kolhapur','Solapur','Amravati','Nanded'],
  'Manipur': ['Imphal','Thoubal','Kakching','Ukhrul','Senapati'],
  'Meghalaya': ['Shillong','Tura','Jowai','Nongpoh','Baghmara'],
  'Mizoram': ['Aizawl','Lunglei','Chanmari','Serchhip','Kolasib'],
  'Nagaland': ['Kohima','Dimapur','Mokokchung','Tuensang','Wokha'],
  'Odisha': ['Bhubaneswar','Cuttack','Puri','Rourkela','Berhampur','Sambalpur','Balasore','Jharsuguda'],
  'Punjab': ['Chandigarh','Ludhiana','Amritsar','Jalandhar','Patiala','Mohali','Bathinda','Firozpur'],
  'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Ajmer','Kota','Bikaner','Alwar','Sikar','Bhilwara'],
  'Sikkim': ['Gangtok','Namchi','Gyalshing','Mangan'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Thanjavur','Sivakasi','Virudhunagar','Rajapalayam','Kovilpatti','Tuticorin','Dindigul','Kumbakonam','Nagercoil'],
  'Telangana': ['Hyderabad','Warangal','Nizamabad','Khammam','Karimnagar','Secunderabad','Ramagundam'],
  'Tripura': ['Agartala','Udaipur','Khowai','Dharmanagar','Ambassa'],
  'Uttar Pradesh': ['Lucknow','Kanpur','Ghaziabad','Agra','Varanasi','Prayagraj','Meerut','Noida','Moradabad','Aligarh'],
  'Uttarakhand': ['Dehradun','Haridwar','Roorkee','Haldwani','Nainital','Rishikesh','Pithoragarh'],
  'West Bengal': ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Darjeeling','Burdwan','Bally'],
  'Andaman and Nicobar Islands': ['Port Blair','Havelock Island','Neil Island','Diglipur','Mayabunder'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman','Diu','Silvassa','Vapi'],
  'Delhi': ['Delhi','New Delhi','North Delhi','South Delhi','East Delhi','West Delhi'],
  'Jammu and Kashmir': ['Srinagar','Jammu','Anantnag','Baramulla','Kathua'],
  'Ladakh': ['Leh','Kargil','Padum'],
  'Lakshadweep': ['Kavaratti','Agatti','Minicoy'],
  'Puducherry': ['Puducherry','Karaikal','Yanam','Mahe']
};

/* ═══════════════════════════════════════════════════════════════
   SMART LOGIN PAGE
  - Single form: identifier + password
  - If identifier contains '@' → try admin-login API
  - Else → try user login API (phone)
   - "Register" link shows registration form
═══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from || '/dashboard';

  const [mode, setMode]       = useState('login');   // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [detectRole, setDetectRole] = useState(null); // 'admin' | 'user' | null

  const [form, setForm] = useState({
    identifier: '', // phone for user, email for admin
    password: '',
    fname: '', lname: '', state: 'Tamil Nadu', city: '',
  });

  const cityOptions = stateCityMap[form.state] || [];
  const nameRegex = /^[A-Za-z\u0B80-\u0BFF\s]+$/;

  const set = (k, v) => {
    // Block numbers in name fields
    if (k === 'fname' || k === 'lname') {
      if (v !== '' && !/^[A-Za-z\u0B80-\u0BFF\s]*$/.test(v)) {
        setErrors(p => ({ ...p, [k]: 'Letters only — no numbers' }));
        return;
      }
    }

    setForm(p => {
      if (k === 'state') {
        return {
          ...p,
          state: v,
          city: stateCityMap[v]?.includes(p.city) ? p.city : '',
        };
      }
      return { ...p, [k]: v };
    });
    setErrors(p => ({ ...p, [k]: '' }));

    // Auto-detect role when typing identifier
    if (k === 'identifier') {
      if (v.toLowerCase() === 'admin') setDetectRole('admin');
      else if (/^\d/.test(v))          setDetectRole('user');
      else                             setDetectRole(null);
    }
  };

  /* ── LOGIN: auto-detect admin vs user ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.identifier.trim()) errs.identifier = 'Enter phone number or email';
    if (!form.password)          errs.password   = 'Password required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const id = form.identifier.trim().toLowerCase();

    try {
      if (id.includes('@')) {
        // ── Admin login
        const admin = await loginAdmin(id, form.password);
        onLogin({ ...admin, role: 'admin' });
        navigate('/admin', { replace: true });
        showToast('Welcome Admin! 👑');
      } else {
        // ── User login (phone)
        if (!/^\d{10}$/.test(form.identifier.trim())) {
          setErrors({ identifier: 'Enter valid 10-digit phone number' });
          setLoading(false); return;
        }
        const user = await loginUser(form.identifier.trim(), form.password);
        onLogin({ ...user, role: 'user' });
        navigate(from, { replace: true });
        showToast(`Welcome back, ${user.name}! 🎆`);
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg === 'User not found')
        setErrors({ identifier: 'Phone not registered — please register first' });
      else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('wrong'))
        setErrors({ password: 'Wrong password' });
      else if (msg.toLowerCase().includes('admin'))
        setErrors({ password: 'Invalid admin credentials' });
      else
        setErrors({ password: msg || 'Login failed' });
    } finally { setLoading(false); }
  };

  /* ── REGISTER ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.fname.trim())                        errs.fname    = 'Required';
    else if (!nameRegex.test(form.fname.trim()))   errs.fname    = 'Letters only';
    if (!form.lname.trim())                        errs.lname    = 'Required';
    else if (!nameRegex.test(form.lname.trim()))   errs.lname    = 'Letters only';
    if (!/^\d{10}$/.test(form.identifier.trim()))  errs.identifier = 'Valid 10-digit phone needed';
    if (!form.city.trim())                         errs.city     = 'Required';
    if (!form.password || form.password.length < 4) errs.password = 'Min 4 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const u = await registerUser({
        fname: form.fname, lname: form.lname,
        phone: form.identifier.trim(),
        city: form.city, state: form.state,
        password: form.password,
      });
      onLogin({ ...u, role: 'user' });
      navigate(from, { replace: true });
      showToast('Account created! Welcome 🎆');
    } catch (err) {
      setErrors({ identifier: err.message });
    } finally { setLoading(false); }
  };

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setDetectRole(null);
    setForm({ identifier: '', password: '', fname: '', lname: '', city: '', state: 'Tamil Nadu' });
  };

  /* Role indicator pill */
  const rolePill = detectRole === 'admin'
    ? { label: '⚙️ Admin', bg: '#1d1f4d', color: '#FAC775' }
    : detectRole === 'user'
      ? { label: '👤 Customer', bg: '#0f6e56', color: '#fff' }
      : null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0a0520',
      position: 'relative', padding: 20,
    }}>
      <FireworksCanvas />

      <div style={{
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(250,199,117,0.22)',
        borderRadius: 18,
        padding: '36px 30px',
        width: '100%',
        maxWidth: mode === 'register' ? 430 : 380,
        boxShadow: '0 16px 48px rgba(0,0,0,.55)',
        position: 'relative', zIndex: 2,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="brand">
            <Logo size={40} />
            <h2 style={{ color: '#FAC775', margin: '0 0 3px', fontSize: 22, fontWeight: 900 }}>
              Sri Murugan Crackers
            </h2>
          </div>
          <p style={{ color: '#cfd0e6', fontSize: 12, margin: 0 }}>
            {mode === 'login' ? 'Login to continue' : 'Create your account'}
          </p>
        </div>

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} autoComplete="off">

            <label style={S.lbl}>
              Phone Number / Email
              {rolePill && (
                <span style={{
                  display: 'inline-block', marginLeft: 8,
                  background: rolePill.bg, color: rolePill.color,
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                  verticalAlign: 'middle',
                }}>
                  {rolePill.label}
                </span>
              )}
            </label>
            <input
              style={S.inp(errors.identifier)}
              type="text"
              placeholder="Your Mobile Number"
              value={form.identifier}
              onChange={e => set('identifier', e.target.value)}
              autoFocus
              maxLength={40}
            />
            {errors.identifier && <div style={S.err}>{errors.identifier}</div>}

            <label style={S.lbl}>Password</label>
            <input
              style={S.inp(errors.password)}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
            {errors.password && <div style={S.err}>{errors.password}</div>}

            {/* Hint */}
            {/* <div style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.5 }}>
              👤 Customer: use your <b style={{ color: '#ccc' }}>10-digit phone</b><br />
              ⚙️ Admin: use <b style={{ color: '#FAC775' }}>admin@crackers.com</b> as email
            </div> */}

            <button style={S.btn(loading)} type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>

            <div style={S.switchRow}>
              New customer?{' '}
              <span onClick={() => switchMode('register')} style={S.link}>
                Register here
              </span>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span
                onClick={() => navigate('/')}
                style={{ fontSize: 12, color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Browse without login
              </span>
            </div>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>

            <div class="register-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={S.lbl}>First Name *</label>
                <input style={S.inp(errors.fname)} placeholder="Your First Name"
                  value={form.fname} onChange={e => set('fname', e.target.value)} />
                {errors.fname && <div style={S.err}>{errors.fname}</div>}
              </div>
              <div>
                <label style={S.lbl}>Last Name *</label>
                <input style={S.inp(errors.lname)} placeholder="Your Last Name"
                  value={form.lname} onChange={e => set('lname', e.target.value)} />
                {errors.lname && <div style={S.err}>{errors.lname}</div>}
              </div>
            </div>

            <label style={S.lbl}>Phone Number *</label>
            <input class="register-phone" style={S.inp(errors.identifier)} type="tel" placeholder="Your Mobile Number"
              maxLength={10} value={form.identifier}
              onChange={e => set('identifier', e.target.value)} />
            {errors.identifier && <div style={S.err}>{errors.identifier}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={S.lbl}>State *</label>
                <SearchableSelect
                  options={stateOptions}
                  value={form.state}
                  onChange={(value) => set('state', value)}
                  placeholder="Select state"
                />
              </div>
              <div>
                <label style={S.lbl}>City *</label>
                <SearchableSelect
                  options={cityOptions}
                  value={form.city}
                  onChange={(value) => set('city', value)}
                  placeholder={cityOptions.length ? 'Select city' : 'Choose a state first'}
                  disabled={!cityOptions.length}
                />
                {errors.city && <div style={S.err}>{errors.city}</div>}
              </div>
            </div>

            <label style={S.lbl}>Password * (min 4 chars)</label>
            <input class="register-pass" style={S.inp(errors.password)} type="password" placeholder="Create a password"
              value={form.password} onChange={e => set('password', e.target.value)} />
            {errors.password && <div style={S.err}>{errors.password}</div>}

            <button style={S.btn(loading)} type="submit" disabled={loading}>
              {loading ? 'Creating...' : ' Create Account '}
            </button>

            <div style={S.switchRow}>
              Already registered?{' '}
              <span onClick={() => switchMode('login')} style={S.link}>Login here</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Inline styles object ── */
const S = {
  lbl: { fontSize: 12, color: '#c8c8e8', display: 'block', margin: '12px 0 4px', fontWeight: 600 },
  inp: (hasErr) => ({
    width: '100%', padding: '10px 12px', boxSizing: 'border-box',
    border: `1.5px solid ${hasErr ? '#fc8181' : 'rgba(250,199,117,0.3)'}`,
    borderRadius: 8, fontSize: 14,
    background: 'rgba(255,255,255,0.10)', color: '#fff',
    outline: 'none', fontFamily: 'inherit',
  }),
  err: { fontSize: 11, color: '#fc8181', marginTop: 3 },
  btn: (disabled) => ({
    width: '100%', marginTop: 18, padding: '12px',
    border: 'none', borderRadius: 8,
    background: disabled ? '#888' : '#FAC775',
    color: '#412402', fontWeight: 700, fontSize: 15,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .2s',
  }),
  switchRow: { textAlign: 'center', fontSize: 12, color: '#b0b0d0', marginTop: 14 },
  link: { color: '#FAC775', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
};

/* ═══════════════════════════════════════════════════════════════
   APP ROOT
  NOTE: Login session uses sessionStorage on purpose — it stays
  active only while this browser tab remains open. Closing the tab
  (or the whole browser) automatically logs the user/admin out, so
  the next visit always starts at the login page instead of silently
  resuming an old session. Cart state is persisted through the
  backend, keyed to a tab-scoped session id.
═══════════════════════════════════════════════════════════════ */
function App() {
  const [user,  setUser]  = useState(null);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('sc_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { sessionStorage.removeItem('sc_user'); }
    }
    setReady(true);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    sessionStorage.setItem('sc_user', JSON.stringify(u));
  };
  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('sc_user');
  };
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  if (!ready) return null;

  return (
    <Router>
      <Routes>
        {/* / and /dashboard → User Dashboard (guest browsing OK) */}
        <Route path="/"
          element={
            user?.role === 'admin'
              ? <Navigate to="/admin" replace />
              : <UserDashboard user={user} onLogout={handleLogout} showToast={showToast} />
          }
        />
        <Route path="/dashboard"
          element={
            user?.role === 'admin'
              ? <Navigate to="/admin" replace />
              : <UserDashboard user={user} onLogout={handleLogout} showToast={showToast} />
          }
        />

        {/* /login → Smart single login form */}
        <Route path="/login"
          element={
            user?.role === 'admin' ? <Navigate to="/admin" replace /> :
            user?.role === 'user'  ? <Navigate to="/dashboard" replace /> :
            <LoginPage onLogin={handleLogin} showToast={showToast} />
          }
        />
        {/* Legacy routes → same login page */}
        <Route path="/user-login"  element={<Navigate to="/login" replace />} />
        <Route path="/admin-login" element={<Navigate to="/login" replace />} />

        {/* /checkout → requires user login */}
        <Route path="/checkout"
          element={
            user?.role === 'user'
              ? <CheckoutPage user={user} showToast={showToast} />
              : <Navigate to="/login" state={{ from: '/checkout' }} replace />
          }
        />

        {/* /order-success */}
        <Route path="/order-success/:orderId"
          element={
            user?.role === 'user'
              ? <OrderSuccessPage user={user} />
              : <Navigate to="/login" replace />
          }
        />

        {/* /admin → requires admin login */}
        <Route path="/admin"
          element={
            user?.role === 'admin'
              ? <AdminDashboard onLogout={handleLogout} showToast={showToast} />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>

      {toast && <div className="toast">{toast}</div>}
    </Router>
  );
}

export default App;
