import { networkInterfaces } from 'node:os'
import { isIP } from 'node:net'

function isLoopback(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

function localIPv4Addresses(interfaces) {
  return Object.entries(interfaces || {})
    .flatMap(([name, values]) => (values || []).map((entry) => ({ name, ...entry })))
    .filter((entry) => entry.family === 'IPv4' && !entry.internal && isIP(entry.address) === 4)
    .sort((a, b) => Number(/^(en0|wlan0|eth0)$/.test(b.name)) - Number(/^(en0|wlan0|eth0)$/.test(a.name)))
    .map((entry) => entry.address)
}

function configuredUrl(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    return url.origin
  } catch {
    return null
  }
}

// Prefer the configured public URL for deployed apps. On a local Mac,
// choose an address actually assigned to this machine, never a caller-supplied
// host. This prevents forged Origin headers from receiving reset tokens.
export function getFrontendUrl(req, { interfaces = networkInterfaces(), configured = process.env.FRONTEND_URL } = {}) {
  const explicit = configuredUrl(configured)
  if (explicit && !isLoopback(new URL(explicit).hostname)) return explicit

  const addresses = localIPv4Addresses(interfaces)
  let origin = null
  try {
    origin = new URL(req.get('origin') || '')
  } catch {
    // No browser Origin; use the configured URL or a local network address.
  }

  const requestedHost = origin?.hostname
  const localOrigin = origin?.protocol === 'http:' &&
    (isLoopback(requestedHost) || addresses.includes(requestedHost)) &&
    /^517[3-9]$/.test(origin.port || '5173')
  const port = localOrigin ? (origin.port || '5173') : '5173'

  if (localOrigin && addresses.includes(requestedHost)) {
    return `http://${requestedHost}:${port}`
  }
  if (addresses.length) return `http://${addresses[0]}:${port}`
  return explicit || 'http://localhost:5173'
}
