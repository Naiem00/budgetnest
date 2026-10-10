import test from 'node:test'
import assert from 'node:assert/strict'
import {buildReport} from './report.js'
const data=[
 {transaction_date:'2026-10-01',currency_code:'JPY',type:'income',amount:'10000',category:'Salary'},
 {transaction_date:'2026-10-02',currency_code:'JPY',type:'expense',amount:'2500',category:'Food'},
 {transaction_date:'2026-10-03',currency_code:'JPY',type:'expense',amount:'1000',category:'Food'},
 {transaction_date:'2026-11-01',currency_code:'JPY',type:'expense',amount:'9000',category:'Food'},
 {transaction_date:'2026-10-10',currency_code:'BDT',type:'expense',amount:'500',category:'Food'}]
test('monthly report only sums matching period/currency with actual rows',()=>{
 const r=buildReport(data,'2026-10-01','2026-10-31','JPY')
 assert.equal(r.income,10000);assert.equal(r.expenses,3500);assert.equal(r.savings,6500)
 assert.deepEqual(r.categories,[['Food',3500]])
})
test('currency switch does not convert or relabel old transactions',()=>{
 const r=buildReport(data,'2026-10-01','2026-10-31','BDT')
 assert.equal(r.expenses,500);assert.equal(r.income,0)
})
