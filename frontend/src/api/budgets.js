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

export function getCurrentBudget(token, month) {
  return request(`/budgets/current${month ? `?month=${encodeURIComponent(month)}` : ''}`, token)
}

export function saveCurrentBudget(token, category, amount, month) {
  return request(`/budgets/current${month ? `?month=${encodeURIComponent(month)}` : ''}`, token, {
    method: 'POST',
    body: JSON.stringify({ category, amount }),
  })
}

export function updateCurrentBudget(token, id, category, amount, month) {
  return request(`/budgets/current/${id}${month ? `?month=${encodeURIComponent(month)}` : ''}`, token, {
    method: 'PUT',
    body: JSON.stringify({ category, amount }),
  })
}

export function deleteCurrentBudget(token, id, month) {
  return request(`/budgets/current/${id}${month ? `?month=${encodeURIComponent(month)}` : ''}`, token, {
    method: 'DELETE',
  })
}
