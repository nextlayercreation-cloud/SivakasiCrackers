import client from './client';
export const getIncomes = async () => { const { data } = await client.get('/incomes'); return data; };
export const addIncome = async (p) => { const { data } = await client.post('/incomes', p); return data; };
export const deleteIncome = async (id) => { const { data } = await client.delete(`/incomes/${id}`); return data; };
