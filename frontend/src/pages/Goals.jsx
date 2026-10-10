import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import { getGoals, createGoal, updateGoal, adjustGoal, deleteGoal } from '../api/goals'
import { money } from '../utils/money'
import '../App.css'

const blank = { title: '', targetAmount: '', deadline: '' }

export default function Goals() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [adjustments, setAdjustments] = useState({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const token = localStorage.getItem('budgetnest_token')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    Promise.all([getCurrentUser(token), getGoals(token)])
      .then(([profile, result]) => { setUser(profile.user); setGoals(result.goals || []) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token, navigate])

  async function refresh() {
    const result = await getGoals(token)
    setGoals(result.goals || [])
  }

  function resetForm() { setForm(blank); setEditingId(null) }

  async function save(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      const data = { title: form.title, targetAmount: form.targetAmount, deadline: form.deadline || null }
      if (editingId) {
        await updateGoal(token, editingId, data)
        setMessage('Goal updated.')
      } else {
        await createGoal(token, data)
        setMessage('New savings goal created!')
      }
      resetForm()
      await refresh()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  function edit(goal) {
    setForm({ title: goal.title, targetAmount: String(goal.targetAmount), deadline: goal.deadline || '' })
    setEditingId(goal.id)
    setError(''); setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function adjust(goal, action) {
    const amount = adjustments[goal.id] || ''
    setBusy(true); setError(''); setMessage('')
    try {
      await adjustGoal(token, goal.id, action, amount)
      setAdjustments(previous => ({ ...previous, [goal.id]: '' }))
      await refresh()
      setMessage(action === 'add' ? 'Savings progress increased.' : 'Savings progress reduced.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function remove(goal) {
    if (!window.confirm(`Delete savings goal “${goal.title}”?`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      await deleteGoal(token, goal.id)
      if (editingId === goal.id) resetForm()
      await refresh()
      setMessage('Goal deleted.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <div className="app">
    <aside className="sidebar"><div><div className="logo"><span className="logoMark">B</span>BudgetNest</div>
      <nav aria-label="Main navigation">
        <button className="navItem" onClick={() => navigate('/')}>▦ Dashboard</button>
        <button className="navItem" onClick={() => navigate('/transactions')}>↕ Transactions</button>
        <button className="navItem" onClick={() => navigate('/budgets')}>◎ Budgets</button>
        <button className="navItem active" aria-current="page">☆ Goals</button>
        <button className="navItem" onClick={() => navigate('/recurring')}>↻ Recurring</button>
        <button className="navItem" onClick={() => navigate('/reports')}>◔ Reports</button>
        <button className="navItem" onClick={() => navigate('/settings')}>⚙ Settings</button>
      </nav></div>
    </aside>
    <main className="main">
      <header className="topbar"><div>
        <p className="eyebrow">VERSION 2.0 · SAVINGS GOALS</p>
        <h1>Savings Goals</h1>
        <p className="muted">Make a plan, track your progress, and keep moving toward what matters.</p>
      </div></header>
      <p className="muted">Goal amounts are recorded manually. Adding progress here does not create a transaction or move money between accounts.</p>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {message && <p role="status" className="positive">{message}</p>}
      <section className="panel goalsEditor">
        <h2>{editingId ? 'Edit savings goal' : 'Create a savings goal'}</h2>
        <p className="muted">New goals use your preferred currency ({user?.currency_code || 'JPY'}). Each goal keeps its original currency.</p>
        <form className="goalForm" onSubmit={save}>
          <label>Goal name<input required maxLength="100" value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Emergency fund" /></label>
          <label>Target amount<input required type="number" min="0.01" max="99999999.99" step="0.01" value={form.targetAmount} onChange={e => setForm({...form,targetAmount:e.target.value})} placeholder="100000" /></label>
          <label>Target date (optional)<input type="date" value={form.deadline} onChange={e => setForm({...form,deadline:e.target.value})}/></label>
          <div className="goalFormActions">
            <button type="submit" className="addButton" disabled={busy}>{busy ? 'Saving...' : editingId ? 'Save changes' : '+ Create Goal'}</button>
            {editingId && <button className="cancelTransactionButton" type="button" disabled={busy} onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </section>
      <section aria-label="Your savings goals" className="goalGrid">
        {loading ? <article className="panel"><p>Loading your savings goals...</p></article> :
         goals.length === 0 ? <article className="panel"><h2>No savings goals yet</h2><p className="muted">Create one above and start tracking.</p></article> :
         goals.map(goal => <article className="panel goalCard" key={goal.id}>
           <div className="panelHeader"><div><p className="eyebrow">{goal.currencyCode} GOAL</p><h2>{goal.title}</h2></div><strong>{goal.percent.toFixed(1)}%</strong></div>
           <div className="goalAmounts"><div><span>Saved</span><strong>{money(goal.savedAmount,goal.currencyCode)}</strong></div><div><span>Target</span><strong>{money(goal.targetAmount,goal.currencyCode)}</strong></div></div>
           <div className="progress" role="progressbar" aria-label={`${goal.title} progress`} aria-valuenow={Math.min(100,Math.round(goal.percent))} aria-valuemin="0" aria-valuemax="100"><div className="progressFill" style={{width:`${Math.min(goal.percent,100)}%`}} /></div>
           <div className="budgetFooter"><span>{goal.savedAmount >= goal.targetAmount ? 'Target reached!' : `${money(goal.remainingAmount,goal.currencyCode)} to go`}</span><span>{goal.deadline ? `By ${goal.deadline}` : 'No deadline'}</span></div>
           <div className="goalActions"><label>Adjust saved amount<input type="number" inputMode="decimal" min="0.01" step="0.01" max="99999999.99" value={adjustments[goal.id] || ''} placeholder="Amount" onChange={e => setAdjustments(prev => ({...prev,[goal.id]:e.target.value}))} /></label>
             <div className="goalButtonRow"><button className="addButton" disabled={busy || !adjustments[goal.id]} onClick={() => adjust(goal,'add')}>+ Save</button><button className="cancelTransactionButton" disabled={busy || !adjustments[goal.id]} onClick={() => adjust(goal,'withdraw')}>− Withdraw</button></div>
           </div>
           <div className="budgetCardActions"><button type="button" disabled={busy} onClick={() => edit(goal)}>Edit target</button><button type="button" disabled={busy} className="budgetDeleteButton" onClick={() => remove(goal)}>Delete</button></div>
         </article>)}
      </section>
    </main>
  </div>
}
