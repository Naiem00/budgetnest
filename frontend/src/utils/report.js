export function isoDay(value) { return typeof value === 'string' ? value.slice(0,10) : '' }
export function buildReport(transactions,start,end,currency) {
  const matching=transactions.filter(t => t.currency_code===currency && isoDay(t.transaction_date)>=start && isoDay(t.transaction_date)<=end)
  const income=matching.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0)
  const expenses=matching.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0)
  const categories=matching.filter(t=>t.type==='expense').reduce((acc,t)=>{
    acc[t.category]=(acc[t.category]||0)+Number(t.amount);return acc
  },{})
  return {income,expenses,savings:income-expenses,categories:Object.entries(categories).sort((a,b)=>b[1]-a[1]),matching}
}
