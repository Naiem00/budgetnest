const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }

  return data
}

export function getTransactions(token) {
  return request('/transactions', token)
}

export function getTransactionSummary(token) {
  return request('/transactions/summary', token)
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
