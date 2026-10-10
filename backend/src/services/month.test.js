import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMonth } from './month.js'
test('month validator accepts real YYYY-MM months', () => {
  assert.equal(parseMonth('2026-10'),'2026-10-01')
  for (const invalid of ['', '2026-00','2026-13','2026-1','2026-01-30','garbage',undefined]) assert.equal(parseMonth(invalid),null)
})
