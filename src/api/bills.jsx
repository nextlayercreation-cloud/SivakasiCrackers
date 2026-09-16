/**
 * src/api/bills.js
 * Firestore-backed bill storage with stock management.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
} from 'firebase/firestore';

import { db } from '../firebase';

function aggregateBillItems(items = []) {
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

async function reduceStockForBillItems(items = []) {
  const groupedItems =
    aggregateBillItems(items);

  const productIds =
    Object.keys(groupedItems);

  if (!productIds.length) return;

  await runTransaction(db, async (transaction) => {
    const products = [];

    for (const productId of productIds) {
      const productRef =
        doc(db, 'products', productId);

      const productSnap =
        await transaction.get(productRef);

      products.push({
        ref: productRef,
        snap: productSnap,
        quantity:
          groupedItems[productId],
      });
    }

    for (const product of products) {
      if (!product.snap.exists()) continue;

      const currentStock =
        Number(product.snap.data().stock || 0);

      const nextStock = Math.max(
        0,
        currentStock - product.quantity
      );

      transaction.update(product.ref, {
        stock: nextStock,
        updatedAt:
          new Date().toISOString(),
      });
    }
  });
}

export const getBills = async () => {
  const billsRef =
    collection(db, 'bills');

  const billsQuery = query(
    billsRef,
    orderBy('createdAt', 'desc')
  );

  const snap =
    await getDocs(billsQuery);

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};


// ─────────────────────────────────────────────────────────────
// CREATE BILL
// ─────────────────────────────────────────────────────────────

export const createBill = async (billData) => {
  const billId =
    `BILL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const now =
    new Date().toISOString();

  const bill = {
    ...billData,
    id: billId,
    createdAt: now,
    updatedAt: now,
  };

  await reduceStockForBillItems(
    billData.items || []
  );

  const billRef =
    doc(db, 'bills', billId);

  await runTransaction(
    db,
    async (transaction) => {
      transaction.set(
        billRef,
        bill
      );
    }
  );

  return bill;
};


// ─────────────────────────────────────────────────────────────
// UPDATE BILL
// ─────────────────────────────────────────────────────────────

export const updateBill = async (
  billId,
  billData
) => {
  const billRef =
    doc(db, 'bills', billId);

  return runTransaction(
    db,
    async (transaction) => {
      const billSnap =
        await transaction.get(billRef);

      if (!billSnap.exists()) {
        return null;
      }

      const oldBill = {
        id: billSnap.id,
        ...billSnap.data(),
      };

      const oldItems =
        aggregateBillItems(
          oldBill.items || []
        );

      const newItems =
        aggregateBillItems(
          billData.items || []
        );

      const productIds = [
        ...new Set([
          ...Object.keys(oldItems),
          ...Object.keys(newItems),
        ]),
      ];

      const productSnapshots = [];

      for (const productId of productIds) {
        const productRef =
          doc(db, 'products', productId);

        const productSnap =
          await transaction.get(productRef);

        productSnapshots.push({
          productId,
          ref: productRef,
          snap: productSnap,
        });
      }

      // Calculate stock difference.
      for (const product of productSnapshots) {
        if (!product.snap.exists()) continue;

        const oldQty =
          oldItems[product.productId] || 0;

        const newQty =
          newItems[product.productId] || 0;

        const currentStock =
          Number(
            product.snap.data().stock || 0
          );

        const nextStock =
          currentStock +
          oldQty -
          newQty;

        if (nextStock < 0) {
          throw new Error(
            `Insufficient stock for product ${product.productId}`
          );
        }

        if (nextStock !== currentStock) {
          transaction.update(
            product.ref,
            {
              stock: nextStock,
              updatedAt:
                new Date().toISOString(),
            }
          );
        }
      }

      const updatedBill = {
        ...oldBill,
        ...billData,
        id: billId,
        updatedAt:
          new Date().toISOString(),
      };

      transaction.set(
        billRef,
        updatedBill
      );

      return updatedBill;
    }
  );
};


// ─────────────────────────────────────────────────────────────
// DELETE BILL → HISTORY
// ─────────────────────────────────────────────────────────────

export const deleteBill = async (billId) => {
  const historyId =
    `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return runTransaction(
    db,
    async (transaction) => {
      const billRef =
        doc(db, 'bills', billId);

      const billSnap =
        await transaction.get(billRef);

      if (!billSnap.exists()) {
        return null;
      }

      const bill = {
        id: billSnap.id,
        ...billSnap.data(),
      };

      const groupedItems =
        aggregateBillItems(
          bill.items || []
        );

      const productIds =
        Object.keys(groupedItems);

      const products = [];

      for (const productId of productIds) {
        const productRef =
          doc(db, 'products', productId);

        const productSnap =
          await transaction.get(productRef);

        products.push({
          ref: productRef,
          snap: productSnap,
          quantity:
            groupedItems[productId],
        });
      }

      // Restore stock.
      for (const product of products) {
        if (!product.snap.exists()) continue;

        const currentStock =
          Number(
            product.snap.data().stock || 0
          );

        transaction.update(
          product.ref,
          {
            stock:
              currentStock +
              product.quantity,
            updatedAt:
              new Date().toISOString(),
          }
        );
      }

      const deletedAt =
        new Date().toISOString();

      const historyRef =
        doc(
          db,
          'history',
          historyId
        );

      transaction.set(
        historyRef,
        {
          id: historyId,
          type: 'bill',
          action: 'DELETE',
          originalId: bill.id,
          originalData: bill,
          originalDate:
            bill.createdAt ||
            deletedAt,
          deletedAt,
          createdAt: deletedAt,
        }
      );

      transaction.delete(
        billRef
      );

      return {
        id: historyId,
        type: 'bill',
        originalId: bill.id,
        deletedAt,
      };
    }
  );
};