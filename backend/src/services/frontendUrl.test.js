import test from 'node:test'
import assert from 'node:assert/strict'
import { getFrontendUrl } from './frontendUrl.js'

const interfaces = {
  en0: [{ family: 'IPv4', internal: false, address: '192.168.171.91' }],
  lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
}
const req = (origin) => ({ get: () => origin })

test('iPhone request creates a reset link reachable from the same LAN', () => {
  assert.equal(getFrontendUrl(req('http://192.168.171.91:5173'), { interfaces, configured: 'http://localhost:5173' }), 'http://192.168.171.91:5173')
})
test('Mac localhost request chooses a LAN address for mobile email', () => {
  assert.equal(getFrontendUrl(req('http://localhost:5174'), { interfaces }), 'http://192.168.171.91:5174')
})
test('malicious Origin is never used as reset URL', () => {
  assert.equal(getFrontendUrl(req('https://evil.example'), { interfaces }), 'http://192.168.171.91:5173')
})
test('configured public URL wins for production', () => {
  assert.equal(getFrontendUrl(req('http://192.168.171.91:5173'), { interfaces, configured: 'https://budgetnest.example' }), 'https://budgetnest.example')
})
test('no LAN available falls back to local URL', () => {
  assert.equal(getFrontendUrl(req('http://localhost:5173'), { interfaces: {}, configured: '' }), 'http://localhost:5173')
})
