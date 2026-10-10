// Pure transaction-table filters, independently testable without the backend.
export function filterTransactions(transactions, {type='all',category='all',from='',to='',query='',sort='date-desc'}={}) {
  const search=String(query).trim().toLocaleLowerCase()
  return [...transactions].filter(t=>{
    if(type!=='all' && t.type!==type)return false
    if(category!=='all' && t.category!==category)return false
    const date=String(t.transaction_date||'').slice(0,10)
    if(from && date<from)return false
    if(to && date>to)return false
    return [t.category,t.merchant,t.note,t.amount].some(v=>String(v??'').toLocaleLowerCase().includes(search))
  }).sort((a,b)=>{
    if(sort==='amount-desc')return Number(b.amount)-Number(a.amount)
    if(sort==='amount-asc')return Number(a.amount)-Number(b.amount)
    const diff=String(a.transaction_date).localeCompare(String(b.transaction_date))
    return sort==='date-asc'?diff:-diff
  })
}
