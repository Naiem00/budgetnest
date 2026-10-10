import test from 'node:test'
import assert from 'node:assert/strict'
import { localMonth, localDay } from './calendar.js'
test('local calendar date uses date components', () => {
  const d=new Date(2026,9,10,0,30)
  assert.equal(localMonth(d),'2026-10')
  assert.equal(localDay(d),'2026-10-10')
})
test('local month handles year rollover', () => {
  assert.equal(localMonth(new Date(2027,0,1)), '2027-01')
})
