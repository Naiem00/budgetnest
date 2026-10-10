import { API_BASE_URL, readApiResponse } from './apiBase'

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}/goals${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  return readApiResponse(response)
}

export const getGoals = token => request('', token)
export const createGoal = (token, details) => request('', token, {
  method: 'POST', body: JSON.stringify(details),
})
export const updateGoal = (token, id, details) => request(`/${id}`, token, {
  method: 'PATCH', body: JSON.stringify(details),
})
export const adjustGoal = (token, id, action, amount) => request(`/${id}/adjustments`, token, {
  method: 'POST', body: JSON.stringify({ action, amount }),
})
export const deleteGoal = (token, id) => request(`/${id}`, token, { method: 'DELETE' })
