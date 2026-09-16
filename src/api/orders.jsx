/**
 * src/api/orders.js
 * Firestore-backed order storage using the client SDK only.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';
import { createNotificationForOrderStatus } from './notifications';

function aggregateOrderItems(items = []) {
  return (items || []).reduce((acc, item) => {
    const qty = Number(item?.qty) || 0;

    if (!item?.productId || qty <= 0) {
      return acc;
    }

    const key = String(item.productId);
    acc[key] = (acc[key] || 0) + qty;

    return acc;
  }, {});
}

async function reduceStockForItems(items = []) {
  const groupedItems = aggregateOrderItems(items);
  const productIds = Object.keys(groupedItems);

  if (!productIds.length) return;

  await runTransaction(db, async (transaction) => {
    const products = [];

    for (const productId of productIds) {
      const productRef = doc(db, 'products', productId);
      const productSnap = await transaction.get(productRef);

      products.push({
        ref: productRef,
        snap: productSnap,
        quantity: groupedItems[productId],
      });
    }

    for (const product of products) {
      if (!product.snap.exists()) continue;

      const currentStock = Number(product.snap.data().stock || 0);
      const nextStock = Math.max(
        0,
        currentStock - product.quantity
      );

      transaction.update(product.ref, {
        stock: nextStock,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

function mapOrder(docSnap) {
  const data = docSnap.data();

  return {
    ...data,
    id: docSnap.id,
    createdAt:
      data.createdAt ||
      data.orderPlacedAt ||
      null,
  };
}

export const getOrders = async () => {
  const ordersRef = collection(db, 'orders');

  const ordersQuery = query(
    ordersRef,
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(ordersQuery);

  return snap.docs.map(mapOrder);
};

export const addOrder = async (orderData) => {
  const orderId =
    `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  if (!orderSnap.exists()) {
    return null;
  }

  const previousStatus = orderSnap.data().status;

  const now = new Date().toISOString();

  const patch = {
    status,
    updatedAt: now,
  };

  if (status === 'Shipped') {
    patch.orderShippedAt = now;
  }

  if (
    status === 'Shipped' &&
    previousStatus !== 'Shipped'
  ) {
    await reduceStockForItems(
      orderSnap.data().items || []
    );
  }

  await updateDoc(orderRef, patch);

  const nextSnap = await getDoc(orderRef);

  if (
    status === 'Shipped' &&
    previousStatus !== 'Shipped'
  ) {
    const updatedOrder = mapOrder(nextSnap);

    await createNotificationForOrderStatus({
      orderId: updatedOrder.id,
      userId: updatedOrder.userId,
      status: 'Shipped',
      type: 'shipping',
      message:
        `Your order ${updatedOrder.id} has been shipped!`,
    });
  }

  return mapOrder(nextSnap);
};

export const shipOrder = async (orderId) =>
  updateOrderStatus(orderId, 'Shipped');


// ─────────────────────────────────────────────────────────────
// DELETE ORDER → HISTORY
// ─────────────────────────────────────────────────────────────

export const deleteOrder = async (orderId) => {
  const historyId =
    `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'orders', orderId);

    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      return null;
    }

    const order = mapOrder(orderSnap);

    const historyRef = doc(
      db,
      'history',
      historyId
    );

    // Only shipped orders reduced stock.
    const shouldRestoreStock =
      order.status === 'Shipped';

    let productSnapshots = [];

    if (shouldRestoreStock) {
      const groupedItems = aggregateOrderItems(
        order.items || []
      );

      const productIds = Object.keys(groupedItems);

      for (const productId of productIds) {
        const productRef = doc(
          db,
          'products',
          productId
        );

        const productSnap =
          await transaction.get(productRef);

        productSnapshots.push({
          ref: productRef,
          snap: productSnap,
          quantity: groupedItems[productId],
        });
      }
    }

    // Restore stock if order was shipped.
    for (const product of productSnapshots) {
      if (!product.snap.exists()) continue;

      const currentStock =
        Number(product.snap.data().stock || 0);

      transaction.update(product.ref, {
        stock:
          currentStock + product.quantity,
        updatedAt: new Date().toISOString(),
      });
    }

    const deletedAt =
      new Date().toISOString();

    transaction.set(historyRef, {
      id: historyId,
      type: 'order',
      action: 'DELETE',
      originalId: order.id,
      originalData: order,
      originalDate:
        order.createdAt ||
        order.orderPlacedAt ||
        deletedAt,
      deletedAt,
      createdAt: deletedAt,
    });

    transaction.delete(orderRef);

    return {
      id: historyId,
      type: 'order',
      originalId: order.id,
      deletedAt,
    };
  });
};