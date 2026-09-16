import client from './client';

export const getExpenses = async () => {
  const { data } =
    await client.get('/expenses');

  return data;
};

export const addExpense = async (payload) => {
  const { data } =
    await client.post(
      '/expenses',
      payload
    );

  return data;
};

export const updateExpense = async (
  id,
  payload
) => {
  const { data } =
    await client.put(
      `/expenses/${id}`,
      payload
    );

  return data;
};

export const deleteExpense = async (id) => {
  const { data } =
    await client.delete(
      `/expenses/${id}`
    );

  return data;
};