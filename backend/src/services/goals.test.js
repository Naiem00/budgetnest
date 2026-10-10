import test from 'node:test'
import assert from 'node:assert/strict'
import { validateGoal, validateGoalAdjustment, presentGoal } from './goals.js'

test('validates goals and optional deadline', () => {
  assert.deepEqual(validateGoal({title:'  Trip to Japan  ',targetAmount:'50000',deadline:'2027-12-01'}),
    {title:'Trip to Japan',targetAmount:50000,deadline:'2027-12-01'})
  assert.equal(validateGoal({title:'',targetAmount:3}).error.includes('name'),true)
  assert.ok(validateGoal({title:'Goal',targetAmount:'1e9'}).error)
  assert.ok(validateGoal({title:'Goal',targetAmount:250,deadline:'2026-02-30'}).error)
  assert.ok(validateGoal({title:'Goal',targetAmount:0}).error)
})
test('validates positive deposits and withdrawals only', () => {
  assert.deepEqual(validateGoalAdjustment({action:'add',amount:'150.25'}),{signedAmount:150.25})
  assert.deepEqual(validateGoalAdjustment({action:'withdraw',amount:'150'}),{signedAmount:-150})
  assert.ok(validateGoalAdjustment({action:'withdraw',amount:-150}).error)
  assert.ok(validateGoalAdjustment({action:'remove',amount:150}).error)
})
test('calculates progress from saved amounts without mixing currencies', () => {
  const g=presentGoal({id:1,title:'Car',target_amount:'1000000',saved_amount:'160000',currency_code:'JPY',deadline:'2028-12-01',created_at:'now'})
  assert.equal(g.remainingAmount,840000)
  assert.equal(g.percent,16)
  assert.equal(g.currencyCode,'JPY')
  assert.equal(presentGoal({id:2,title:'Test',target_amount:'100',saved_amount:'125',currency_code:'BDT'}).percent,125)
})
