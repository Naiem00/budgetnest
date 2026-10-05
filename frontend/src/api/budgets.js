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

export function getCurrentBudget(token) {
  return request('/budgets/current', token)
}

export function saveCurrentBudget(token, amount) {
  return request('/budgets/current', token, {
    method: 'PUT',
    body: JSON.stringify({ amount }),
  })
}
