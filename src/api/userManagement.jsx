import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';

import { db } from '../firebase';

export const getUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getAdmins = async () => {
  const snapshot = await getDocs(collection(db, 'admins'));

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addAdmin = async (
  username,
  password
) => {

  const existing = await getDocs(
    query(
      collection(db, 'admins'),
      where('email', '==', username)
    )
  );

  if (!existing.empty) {
    throw new Error('Admin already exists');
  }

  await addDoc(
    collection(db, 'admins'),
    {
      email: username,
      password,
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  );
};

export const deleteAdmin = async (id) => {
  await deleteDoc(doc(db, 'admins', id));
};

export const deleteUser = async (id) => {
  await deleteDoc(doc(db, 'users', id));
};