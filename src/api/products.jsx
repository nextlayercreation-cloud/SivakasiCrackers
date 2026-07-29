/**
 * src/api/products.js
 * Replaces the product-related functions from utils/storage.js.
 * Every function returns a Promise — call sites must use
 * async/await or .then().
 */
import client from './client';

export const getProducts = async () => {
  const { data } = await client.get('/products');
  return data;
};

export const addProduct = async (productData) => {
  const { data } = await client.post('/products', productData);
  return data;
};

export const updateProduct = async (id, productData) => {
  const { data } = await client.put(`/products/${id}`, productData);
  return data;
};

export const deleteProduct = async (id) => {
  await client.delete(`/products/${id}`);
};

export const addStockToProduct = async (productId, qty) => {
  const { data } = await client.post(`/products/${productId}/stock`, { qty });
  return data;
};
