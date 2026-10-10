import { API_BASE_URL, readApiResponse } from './apiBase'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  return readApiResponse(response)
}

export function registerUser(formData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(formData),
  })
}

export function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getCurrentUser(token) {
  return request('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token, password) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function updateProfile(token, details) {
  return request('/auth/profile', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(details) })
}
export function changePassword(token, currentPassword, newPassword) {
  return request('/auth/change-password', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({currentPassword,newPassword}) })
}
