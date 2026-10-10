import { API_BASE_URL, readApiResponse } from './apiBase'

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  return readApiResponse(response)
}

export function getTransactions(token) {
  return request('/transactions', token)
}

export function getTransactionSummary(token, month) {
  return request(`/transactions/summary${month ? `?month=${encodeURIComponent(month)}` : ''}`, token)
}

export function createTransaction(token, transaction) {
  return request('/transactions', token, {
    method: 'POST',
    body: JSON.stringify(transaction),
  })
}

export function deleteTransaction(token, id) {
  return request(`/transactions/${id}`, token, {
    method: 'DELETE',
  })
}

export function updateTransaction(token, id, transaction) {
  return request(`/transactions/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(transaction),
  })
}
