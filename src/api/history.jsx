import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';

import { db } from '../firebase';

export const getHistory = async () => {
  const historyRef = collection(db, 'history');

  const historyQuery = query(
    historyRef,
    orderBy('deletedAt', 'desc')
  );

  const snap = await getDocs(historyQuery);

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};