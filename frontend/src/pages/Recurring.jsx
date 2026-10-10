import {useCallback,useEffect,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {getCurrentUser} from '../api/auth'
import {listRecurring,createRecurring,updateRecurring,setRecurringActive,recordRecurringMonth} from '../api/recurring'
import {localDay,localMonth} from '../utils/calendar'
import {money} from '../utils/money'
import '../App.css'

const empty=(month)=>({title:'',type:'expense',amount:'',category:'Housing',merchant:'',paymentMethod:'',note:'',dayOfMonth:'1',startMonth:month})
const categories=['Housing','Food','Transport','Shopping','Salary','Bills','Entertainment','Health','Other']
function scheduledDate(month,day){
  const [y,m]=month.split('-').map(Number)
  const leap=(y%4===0 && (y%100!==0 || y%400===0))
  const max=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]
  return `${month}-${String(Math.min(Number(day),max)).padStart(2,'0')}`
}
export default function Recurring(){
  const navigate=useNavigate()
  const [month,setMonth]=useState(localMonth)
  const [templates,setTemplates]=useState([])
  const [user,setUser]=useState(null)
  const [today,setToday]=useState(localDay)
  const [form,setForm]=useState(()=>empty(localMonth()))
  const [editingId,setEditingId]=useState(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const token=localStorage.getItem('budgetnest_token')
  const refresh=useCallback(async()=>{
    const result=await listRecurring(token,month)
    setTemplates(result.templates || [])
  },[token,month])
  useEffect(()=>{
    if(!token){navigate('/login');return}
    let cancelled=false
    setLoading(true)
    Promise.all([getCurrentUser(token),listRecurring(token,month)])
      .then(([profile,data])=>{if(!cancelled){setUser(profile.user);setTemplates(data.templates||[])
      const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:profile.user.country_code==='BD'?'Asia/Dhaka':'Asia/Tokyo'}).formatToParts(new Date())
      const value=kind=>parts.find(p=>p.type===kind)?.value
      setToday(`${value('year')}-${value('month')}-${value('day')}`)}})
      .catch(e=>{if(!cancelled)setError(e.message)})
      .finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[month,navigate,token])
  function resetForm(){setEditingId(null);setForm(empty(localMonth()))}
  async function save(event){
    event.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      if(editingId){await updateRecurring(token,editingId,form);setMessage('Template updated. Past records are unchanged.')}
      else{await createRecurring(token,form);setMessage('Recurring template created. No transaction was added.')}
      resetForm();await refresh()
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  function edit(t){
    setEditingId(t.id)
    setForm({title:t.title,type:t.type,amount:String(t.amount),category:t.category,merchant:t.merchant||'',paymentMethod:t.paymentMethod||'',note:t.note||'',dayOfMonth:String(t.dayOfMonth),startMonth:t.startMonth})
    setMessage('');setError('');window.scrollTo({top:0,behavior:'smooth'})
  }
  async function toggle(t){
    setBusy(true);setError('');setMessage('')
    try{await setRecurringActive(token,t.id,!t.active);await refresh();setMessage(t.active?'Template paused.':'Template resumed.')}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function record(t){
    const due=scheduledDate(month,t.dayOfMonth)
    if(!window.confirm(`Record ${t.title} (${money(t.amount,t.currencyCode)}) for ${due}?\nThis will create ONE ${t.type} transaction.`))return
    setBusy(true);setError('');setMessage('')
    try{await recordRecurringMonth(token,t.id,month);await refresh();setMessage(`${t.title} recorded for ${due}. View Transactions to see it.`)}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="app">
    <aside className="sidebar"><div><div className="logo"><span className="logoMark">B</span>BudgetNest</div>
      <nav aria-label="Main navigation">
        <button className="navItem" onClick={()=>navigate('/')}>▦ Dashboard</button>
        <button className="navItem" onClick={()=>navigate('/transactions')}>↕ Transactions</button>
        <button className="navItem" onClick={()=>navigate('/budgets')}>◎ Budgets</button>
        <button className="navItem" onClick={()=>navigate('/goals')}>☆ Goals</button>
        <button className="navItem active" aria-current="page">↻ Recurring</button>
        <button className="navItem" onClick={()=>navigate('/reports')}>◔ Reports</button>
        <button className="navItem" onClick={()=>navigate('/settings')}>⚙ Settings</button>
      </nav></div></aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">VERSION 2.0 · SPRINT 2</p><h1>Recurring Transactions</h1><p className="muted">Save templates for salary, rent, and regular bills.</p></div></header>
      <p className="muted">Transactions are <strong>never posted automatically</strong>. Each monthly payment requires your confirmation. Records keep their original currency.</p>
      {error&&<p role="alert" className="auth-error">{error}</p>}
      {message&&<p role="status" className="positive">{message}</p>}
      <section className="panel recurringEditor">
        <h2>{editingId?'Edit recurring payment':'New recurring payment'}</h2>
        <p className="muted">{editingId?'Changes apply to future manual posts only.':`New templates use ${user?.currency_code||'JPY'} (your preferred currency).`}</p>
        <form className="recurringForm" onSubmit={save}>
          <label>Title<input required maxLength="100" placeholder="Rent / Monthly Salary" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value,category:e.target.value==='income'?'Salary':'Housing'})}><option value="expense">Expense</option><option value="income">Income</option></select></label>
          <label>Amount<input required type="number" min="0.01" max="99999999.99" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
          <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Payment day (1–31)<input required type="number" min="1" max="31" step="1" value={form.dayOfMonth} onChange={e=>setForm({...form,dayOfMonth:e.target.value})}/></label>
          <label>Start month<input required type="month" value={form.startMonth} onChange={e=>setForm({...form,startMonth:e.target.value})}/></label>
          <label>Merchant / source<input maxLength="150" value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})}/></label>
          <label>Payment method<input maxLength="50" value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}/></label>
          <label className="recurringWide">Note (optional)<textarea rows="2" maxLength="5000" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
          <div className="recurringWide recurringActions"><button type="submit" disabled={busy} className="addButton">{busy?'Saving...':editingId?'Update template':'+ Create Template'}</button>{editingId&&<button type="button" className="cancelTransactionButton" onClick={resetForm}>Cancel</button>}</div>
        </form>
      </section>
      <section className="recurringMonth"><label>Review month<input aria-label="Review month" type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label><p className="muted">Choose a month to see what was recorded. Payment day 29–31 moves to the month's last day when necessary.</p></section>
      <section className="recurringGrid" aria-label="Recurring templates">
        {loading?<article className="panel">Loading recurring payments...</article>:
          templates.length===0?<article className="panel"><h2>No templates yet</h2><p className="muted">Create one above to start tracking regular income or bills.</p></article>:
          templates.map(t=>{
            const due=scheduledDate(month,t.dayOfMonth)
            const beforeStart=month<t.startMonth
            const notDueYet=due>today
            const canPost=t.active&&!t.posted&&!beforeStart&&!notDueYet
            return <article className="panel recurringCard" key={t.id}>
              <div className="panelHeader"><div><p className="eyebrow">{t.type==='income'?'INCOME':'EXPENSE'} · {t.currencyCode}</p><h2>{t.title}</h2></div><strong>{money(t.amount,t.currencyCode)}</strong></div>
              <p className="muted">Every month on day {t.dayOfMonth} · Due {due} · {t.category}</p>
              <p className="recurringStatus">{t.posted?'✓ Recorded for this month':!t.active?'Paused':beforeStart?'Not started':notDueYet?'Not due yet':'Ready for review'}</p>
              <div className="recurringActions"><button className="addButton" disabled={busy||!canPost} onClick={()=>record(t)}>{t.posted?'Already recorded':'Review & Record'}</button><button className="cancelTransactionButton" disabled={busy} onClick={()=>edit(t)}>Edit</button><button className="cancelTransactionButton" disabled={busy} onClick={()=>toggle(t)}>{t.active?'Pause':'Resume'}</button></div>
            </article>
          })}
      </section>
    </main>
  </div>
}
