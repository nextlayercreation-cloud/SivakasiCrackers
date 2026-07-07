/**
 * src/api/bills.js
 * Firestore-backed bill storage with stock reduction.
 */
import { collection, doc, getDocs, orderBy, query, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

function aggregateBillItems(items = []) {
  return (items || []).reduce((acc, item) => {
    const qty = Number(item?.qty) || 0;
    if (!item?.productId || qty <= 0) return acc;
    const key = String(item.productId);
    acc[key] = (acc[key] || 0) + qty;
    return acc;
  }, {});
}

async function reduceStockForBillItems(items = []) {
  const groupedItems = aggregateBillItems(items);
  const productIds = Object.keys(groupedItems);
  if (!productIds.length) return;

  await runTransaction(db, async (transaction) => {
    for (const productId of productIds) {
      const productRef = doc(db, 'products', productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) continue;
      const currentStock = Number(productSnap.data().stock || 0);
      const nextStock = Math.max(0, currentStock - groupedItems[productId]);
      transaction.update(productRef, {
        stock: nextStock,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

export const getBills = async () => {
  const billsRef = collection(db, 'bills');
  const billsQuery = query(billsRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(billsQuery);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const createBill = async (billData) => {
  const billId = `BILL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const bill = {
    ...billData,
    id: billId,
    createdAt: now,
    updatedAt: now,
  };

  await reduceStockForBillItems(billData.items || []);
  const billRef = doc(db, 'bills', billId);
  await runTransaction(db, async (transaction) => {
    transaction.set(billRef, bill);
  });
  return bill;
};
