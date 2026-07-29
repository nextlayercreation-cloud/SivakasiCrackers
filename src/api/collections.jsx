import client from './client';
const base = (type) => `/collections/${type}`;
export const getCollection   = async (type)       => { const { data } = await client.get(base(type)); return data; };
export const addToCollection = async (type, item)  => { const { data } = await client.post(base(type), item); return data; };
export const updateInCollection = async (type, id, item) => { const { data } = await client.put(`${base(type)}/${id}`, item); return data; };
export const deleteFromCollection = async (type, id) => { const { data } = await client.delete(`${base(type)}/${id}`); return data; };
