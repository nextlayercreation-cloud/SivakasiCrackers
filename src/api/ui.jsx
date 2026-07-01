import client from './client';

export const getExtraCategories = async () => {
  const { data } = await client.get('/ui/categories');
  return data;
};

export const saveExtraCategories = async (categories) => {
  const { data } = await client.put('/ui/categories', { categories });
  return data;
};

export const getCart = async (ownerId) => {
  const { data } = await client.get(`/ui/cart/${ownerId}`);
  return data;
};

export const saveCart = async (ownerId, items) => {
  const { data } = await client.put(`/ui/cart/${ownerId}`, { items });
  return data;
};

export const clearCart = async (ownerId) => {
  const { data } = await client.delete(`/ui/cart/${ownerId}`);
  return data;
};