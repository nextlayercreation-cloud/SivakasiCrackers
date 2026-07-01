/**
 * src/api/notifications.js
 * Firestore-backed notifications for customer alerts.
 */
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

function mapNotification(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

function notificationDocId(orderId, status) {
  return `order-${orderId}-${String(status).toLowerCase()}`;
}

export const getNotificationsForUser = async (userId) => {
  const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', String(userId))));
  return snap.docs
    .map(mapNotification)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const getUnreadCountForUser = async (userId) => {
  const notifications = await getNotificationsForUser(userId);
  return notifications.filter((notification) => !notification.read).length;
};

export const markAllNotificationsRead = async (userId) => {
  const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', String(userId))));
  await Promise.all(
    snap.docs.map(async (notificationDoc) => {
      if (!notificationDoc.data().read) {
        await updateDoc(doc(db, 'notifications', notificationDoc.id), { read: true, updatedAt: new Date().toISOString() });
      }
    }),
  );
};

export const createNotificationForOrderStatus = async ({ orderId, userId, status, message, type = 'shipping' }) => {
  if (!orderId || !userId || !status || !message) return false;
  const id = notificationDocId(orderId, status);
  const ref = doc(db, 'notifications', id);
  const existing = await getDoc(ref);
  if (existing.exists()) return false;

  const now = new Date().toISOString();
  await setDoc(ref, {
    id,
    userId: String(userId),
    orderId: String(orderId),
    status,
    type,
    message,
    read: false,
    createdAt: now,
    updatedAt: now,
  });
  return true;
};
