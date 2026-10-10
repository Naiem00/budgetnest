import { test } from 'node:test'
import assert from 'node:assert/strict'
import {validateTemplate,scheduledDate,todayForCountry,presentTemplate} from './recurring.js'
const sample={title:'Rent',type:'expense',amount:'55000',category:'Housing',dayOfMonth:31,startMonth:'2026-10'}
test('valid template and optional metadata',()=>{
  assert.deepEqual(validateTemplate(sample),{title:'Rent',type:'expense',amount:55000,category:'Housing',merchant:null,paymentMethod:null,note:null,dayOfMonth:31,startMonth:'2026-10-01'})
  assert.equal(validateTemplate({...sample,amount:-1}).error!=null,true)
  assert.ok(validateTemplate({...sample, title:'   '}).error)
  assert.ok(validateTemplate({...sample,dayOfMonth:32}).error)
  assert.ok(validateTemplate({...sample,startMonth:'2026-13'}).error)
  assert.ok(validateTemplate({...sample,merchant:42}).error)
  assert.ok(validateTemplate({...sample,note:'x'.repeat(5001)}).error)
})
test('31st clamps to the end of short or leap month',()=>{
  assert.equal(scheduledDate('2027-02',31),'2027-02-28')
  assert.equal(scheduledDate('2028-02',31),'2028-02-29')
  assert.equal(scheduledDate('2027-04',31),'2027-04-30')
  assert.equal(scheduledDate('2027-12',31),'2027-12-31')
  assert.equal(scheduledDate('2026-02',0),null)
})
test('country local day honors Dhaka vs Tokyo',()=>{
  const instant=new Date('2026-10-10T16:30:00Z')
  assert.equal(todayForCountry('JP',instant),'2026-10-11')
  assert.equal(todayForCountry('BD',instant),'2026-10-10')
})
test('display keeps recorded currency and posted flag',()=>{
  const view=presentTemplate({id:8,title:'Rent',type:'expense',amount:'100.20',currency_code:'BDT',category:'Housing',day_of_month:1,start_month:'2026-10-01',active:true,posted:true,transaction_id:10})
  assert.equal(view.currencyCode,'BDT');assert.equal(view.amount,100.20)
  assert.equal(view.posted,true);assert.equal(view.startMonth,'2026-10')
})
