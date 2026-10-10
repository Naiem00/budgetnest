import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import { getTransactions } from '../api/transactions'
import { money } from '../utils/money'
import { buildReport,isoDay } from '../utils/report'
import { localMonth } from '../utils/calendar'
import '../App.css'

export default function Reports() {
  const navigate=useNavigate()
  const [user,setUser]=useState(null)
  const [transactions,setTransactions]=useState([])
  const [mode,setMode]=useState('monthly')
  const [month,setMonth]=useState(localMonth())
  const [year,setYear]=useState(new Date().getFullYear())
  const [startDate,setStartDate]=useState('')
  const [endDate,setEndDate]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    const token=localStorage.getItem('budgetnest_token')
    if(!token){navigate('/login');return}
    Promise.all([getCurrentUser(token),getTransactions(token)])
      .then(([profile,data])=>{setUser(profile.user);setTransactions(data.transactions||[])})
      .catch(err=>setError(err.message)).finally(()=>setLoading(false))
  },[navigate])
  const start= startDate || (mode==='yearly'?`${year}-01-01`:`${month}-01`)
  const end= endDate || (mode==='yearly'?`${year}-12-31`:`${month}-${String(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()).padStart(2,'0')}`)
  const currency=user?.currency_code||'JPY'
  const report=useMemo(()=>buildReport(transactions,start,end,currency),[transactions,start,end,currency])
  const yearly=useMemo(()=>Array.from({length:12},(_,i)=>{
    const key=`${year}-${String(i+1).padStart(2,'0')}`
    const rows=transactions.filter(t=>t.currency_code===currency && isoDay(t.transaction_date).startsWith(key))
    return {key, income:rows.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0),expenses:rows.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0)}
  }),[transactions,year,currency])
  const max=Math.max(1,...yearly.flatMap(m=>[m.income,m.expenses]))
  return <div className="app"><aside className="sidebar"><div><div className="logo"><span className="logoMark">B</span>BudgetNest</div><nav>
    <button className="navItem" onClick={()=>navigate('/')}>▦ Dashboard</button><button className="navItem" onClick={()=>navigate('/transactions')}>↕ Transactions</button><button className="navItem" onClick={()=>navigate('/budgets')}>◎ Budgets</button><button className="navItem" onClick={()=>navigate('/goals')}>☆ Goals</button><button className="navItem active">◔ Reports</button><button className="navItem" onClick={()=>navigate('/settings')}>⚙ Settings</button>
  </nav></div></aside><main className="main"><header className="topbar"><div><p className="eyebrow">REAL DATA ANALYTICS</p><h1>Reports</h1><p className="muted">Financial overview for {currency}; historical amounts are never converted.</p></div></header>
  {error && <p role="alert" className="auth-error">{error}</p>}
  <section className="filterGrid" aria-label="Reporting period">
    <label>View<select value={mode} onChange={e=>{setMode(e.target.value);setStartDate('');setEndDate('')}}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
    {mode==='monthly'?<label>Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>:<label>Year<input type="number" min="2000" max="2100" value={year} onChange={e=>setYear(Number(e.target.value))}/></label>}
    <label>From (optional)<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
    <label>To (optional)<input type="date" min={startDate||undefined} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
    <button className="cancelTransactionButton" type="button" onClick={()=>{setStartDate('');setEndDate('')}}>Clear range</button>
  </section>
  {loading ? <p>Loading actual transactions...</p> : <>
    <section className="stats"><article className="statCard"><span>Income</span><strong>{money(report.income,currency)}</strong></article><article className="statCard"><span>Expenses</span><strong>{money(report.expenses,currency)}</strong></article><article className="statCard"><span>Savings</span><strong>{money(report.savings,currency)}</strong></article></section>
    <section className="panel"><h2>Monthly income vs expenses — {year}</h2><p className="muted">Purple: income · Coral: expenses. Values from saved transactions.</p>
      {yearly.every(r=>!r.income&&!r.expenses)?<p className="muted">No transactions for this year.</p>:<div className="reportBars" role="img" aria-label="Monthly income and expense bar chart">{yearly.map(r=><div key={r.key} title={`${r.key}: Income ${money(r.income,currency)}, Expenses ${money(r.expenses,currency)}`}><div className="bar" style={{height:`${Math.max(3,r.income/max*120)}px`}}/><div className="bar expense" style={{height:`${Math.max(3,r.expenses/max*120)}px`}}/><span>{r.key.slice(5)}</span></div>)}</div>}
    </section>
    <section className="panel reportPanel"><h2>Spending by category</h2>
    {!report.categories.length?<p className="muted">No expenses for the selected period.</p>:report.categories.map(([category,amount])=>{
      const percent=report.expenses ? amount/report.expenses*100:0
      return <div className="reportCategory" key={category}><div className="reportCategoryHeader"><strong>{category}</strong><span>{money(amount,currency)} · {percent.toFixed(1)}%</span></div><div className="progress"><div className="progressFill" style={{width:`${Math.min(percent,100)}%`}}/></div></div>
    })}</section>
    <section className="panel"><h2>Summary</h2><p>{report.matching.length} records between {start} and {end} in {currency}. {report.savings<0?'You spent more than you earned.':'Savings = income − expenses.'}</p></section>
  </>}
  </main></div>
}
