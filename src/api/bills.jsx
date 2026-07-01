/**
 * src/api/bills.js
 * Replaces the billing-related functions from utils/storage.js.
 */
import client from './client';

export const getBills = async () => {
  const { data } = await client.get('/bills');
  return data;
};

export const createBill = async (billData) => {
  const { data } = await client.post('/bills', billData);
  return data;
};
