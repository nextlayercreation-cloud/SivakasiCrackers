/**
 * src/api/auth.js
 * Customer registration/login still uses the existing API.
 * Admin login now resolves against the Firestore `admins`
 * collection using the client SDK only.
 */
import client from './client';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

function extractMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

const DEFAULT_ADMIN = {
  id: 'admin@crackers.com',
  email: 'admin@crackers.com',
  name: 'Admin',
  password: 'admin123',
  role: 'admin',
};

async function ensureDefaultAdmin() {
  const adminRef = doc(db, 'admins', DEFAULT_ADMIN.id);
  const snap = await getDoc(adminRef);
  if (!snap.exists()) {
    await setDoc(adminRef, {
      ...DEFAULT_ADMIN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export const registerUser = async (formData) => {
  try {
    const { data } = await client.post('/auth/register', formData);
    return data;
  } catch (err) {
    throw new Error(extractMessage(err, 'Registration failed'));
  }
};

/**
 * Customer login. Resolves with the user object, or rejects
 * with an Error whose .message is suitable for display
 * (e.g. "User not found" / "Wrong password").
 */
export const loginUser = async (phone, password) => {
  try {
    const { data } = await client.post('/auth/login', { phone, password });
    return data;
  } catch (err) {
    throw new Error(extractMessage(err, 'Login failed'));
  }
};

/**
 * Admin login. Completely separate endpoint from customer login —
 * no shared form, no shared code path.
 */
export const loginAdmin = async (email, password) => {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    await ensureDefaultAdmin();
    const adminsRef = collection(db, 'admins');
    const adminQuery = query(
      adminsRef,
      where('email', '==', normalizedEmail),
      where('password', '==', password),
      limit(1),
    );
    const snap = await getDocs(adminQuery);
    if (snap.empty) {
      throw new Error('Invalid admin credentials');
    }
    const admin = snap.docs[0].data();
    return { ...admin, id: snap.docs[0].id, role: 'admin' };
  } catch (err) {
    throw new Error(extractMessage(err, 'Invalid admin credentials'));
  }
};
