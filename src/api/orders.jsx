/**
 * src/api/orders.js
 * Firestore-backed order storage using the client SDK only.
 */
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createNotificationForOrderStatus } from './notifications';

function mapOrder(docSnap) {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt || data.orderPlacedAt || null,
  };
}

export const getOrders = async () => {
  const ordersRef = collection(db, 'orders');
  const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(ordersQuery);
  return snap.docs.map(mapOrder);
};

export const addOrder = async (orderData) => {
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);
  const order = {
    ...orderData,
    id: orderId,
    status: 'Pending',
    orderPlacedAt: now,
    orderShippedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(orderRef, order);
  return order;
};

export const updateOrderStatus = async (orderId, status) => {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) return null;
  const previousStatus = orderSnap.data().status;
  const now = new Date().toISOString();
  const patch = {
    status,
    updatedAt: now,
  };
  if (status === 'Shipped') {
    patch.orderShippedAt = now;
  }
  await updateDoc(orderRef, patch);
  const nextSnap = await getDoc(orderRef);
  if (status === 'Shipped' && previousStatus !== 'Shipped') {
    const updatedOrder = mapOrder(nextSnap);
    await createNotificationForOrderStatus({
      orderId: updatedOrder.id,
      userId: updatedOrder.userId,
      status: 'Shipped',
      type: 'shipping',
      message: `Your order ${updatedOrder.id} has been shipped!`,
    });
  }
  return mapOrder(nextSnap);
};

export const shipOrder = async (orderId) => updateOrderStatus(orderId, 'Shipped');
