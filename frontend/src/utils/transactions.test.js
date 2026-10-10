import test from 'node:test'
import assert from 'node:assert/strict'
import {filterTransactions} from './transactions.js'
const items=[
 {id:1,type:'expense',category:'Food',merchant:'Gyomu',amount:'4809',transaction_date:'2026-10-10',note:'Groceries'},
 {id:2,type:'income',category:'Salary',merchant:'',amount:'200000',transaction_date:'2026-09-30'},
 {id:3,type:'expense',category:'Transport',merchant:'JR',amount:'250',transaction_date:'2026-10-08'},
]
test('transaction filters are combinable and keep source unchanged',()=>{
 const before=JSON.stringify(items)
 assert.deepEqual(filterTransactions(items,{type:'expense',category:'Food',from:'2026-10-01',to:'2026-10-31'}).map(x=>x.id),[1])
 assert.deepEqual(filterTransactions(items,{query:'grocer'}).map(x=>x.id),[1])
 assert.deepEqual(filterTransactions(items,{query:'JR'}).map(x=>x.id),[3])
 assert.equal(JSON.stringify(items),before)
})
test('sorting by amount and date orders numeric data',()=>{
 assert.deepEqual(filterTransactions(items,{sort:'amount-asc'}).map(x=>x.id),[3,1,2])
 assert.deepEqual(filterTransactions(items,{sort:'date-desc'}).map(x=>x.id),[1,3,2])
})
