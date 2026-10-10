import test from 'node:test'
import assert from 'node:assert/strict'
import { validMoney,validDate,validCategory } from './finance.js'
test('amount rejects unsafe or misleading financial values',()=>{
  for(const n of [-10,'1e6','0','NaN','1.234','100000000','-0.01','10abc',null]) assert.equal(validMoney(n),false,String(n))
  for(const n of ['0.01','200',100,'99999999.99']) assert.equal(validMoney(n),true,String(n))
})
test('dates reject impossible calendar days',()=>{
  for(const d of ['2026-02-29','2026-13-01','2026-00-09','2026-02-30','2026-10-1']) assert.equal(validDate(d),false,d)
  for(const d of ['2024-02-29','2026-10-10']) assert.equal(validDate(d),true,d)
})
test('categories require a nonblank bounded string',()=>{assert.equal(validCategory(' Food '),true);assert.equal(validCategory(' '),false);assert.equal(validCategory(7),false)})
