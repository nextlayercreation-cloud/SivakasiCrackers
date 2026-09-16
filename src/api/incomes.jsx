import client from './client';

export const getIncomes = async () => {
  const { data } =
    await client.get('/incomes');

  return data;
};

export const addIncome = async (payload) => {
  const { data } =
    await client.post('/incomes', payload);

  return data;
};

export const updateIncome = async (
  id,
  payload
) => {
  const { data } =
    await client.put(
      `/incomes/${id}`,
      payload
    );

  return data;
};

export const deleteIncome = async (id) => {
  const { data } =
    await client.delete(
      `/incomes/${id}`
    );

  return data;
};