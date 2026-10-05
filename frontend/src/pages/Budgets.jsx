import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import { getCurrentBudget, saveCurrentBudget } from '../api/budgets'
import { getTransactionSummary } from '../api/transactions'
import '../App.css'

function Budgets() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [budget, setBudget] = useState(null)
  const [expenses, setExpenses] = useState(0)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('budgetnest_token')
    if (!token) return navigate('/login')

    Promise.all([
      getCurrentUser(token),
      getCurrentBudget(token),
      getTransactionSummary(token),
    ])
      .then(([userData, budgetData, summaryData]) => {
        setUser(userData.user)
        setBudget(budgetData.budget)
        setAmount(budgetData.budget?.amount || '')
        setExpenses(Number(summaryData.expenses))
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  function money(value) {
    return new Intl.NumberFormat(
      user?.country_code === 'BD' ? 'en-BD' : 'ja-JP',
      {
        style: 'currency',
        currency: user?.currency_code || 'JPY',
        maximumFractionDigits: user?.currency_code === 'JPY' ? 0 : 2,
      }
    ).format(Number(value) || 0)
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('budgetnest_token')
      const data = await saveCurrentBudget(token, Number(amount))
      setBudget(data.budget)
      setMessage('Monthly budget saved successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const budgetAmount = Number(budget?.amount || 0)
  const remaining = budgetAmount - expenses
  const percent = budgetAmount > 0 ? (expenses / budgetAmount) * 100 : 0
  const overBudget = budgetAmount > 0 && expenses > budgetAmount

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="logo">
            <span className="logoMark">B</span>
            <span>BudgetNest</span>
          </div>

          <nav>
            <button className="navItem" onClick={() => navigate('/')}>▦ Dashboard</button>
            <button className="navItem" onClick={() => navigate('/transactions')}>↕ Transactions</button>
            <button className="navItem active">◎ Budgets</button>
            <button className="navItem" onClick={() => navigate('/reports')}>◔ Reports</button>
          </nav>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">MONTHLY PLAN</p>
            <h1>Budget</h1>
            <p className="muted">Set a spending limit for this month.</p>
          </div>
        </header>

        <section className="stats">
          <article className="statCard">
            <span>Monthly budget</span>
            <strong>{budget ? money(budgetAmount) : 'Not set'}</strong>
          </article>

          <article className="statCard">
            <span>Spent</span>
            <strong>{money(expenses)}</strong>
          </article>

          <article className="statCard">
            <span>Remaining</span>
            <strong>{budget ? money(remaining) : '—'}</strong>
            {overBudget && <small className="budgetDanger">Budget exceeded</small>}
          </article>
        </section>

        <section className="panel budgetManagementPanel">
          <p className="eyebrow">CURRENT MONTH</p>
          <h2>Set monthly budget</h2>

          <form className="budgetForm" onSubmit={handleSave}>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="120000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <button className="addButton" disabled={saving}>
              {saving ? 'Saving...' : budget ? 'Update budget' : 'Set budget'}
            </button>
          </form>

          {message && <p className="positive">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          {budget && (
            <>
              <div className="progress budgetPageProgress">
                <div
                  className="progressFill"
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>

              <div className="budgetFooter">
                <span>{percent.toFixed(1)}% used</span>
                <span>
                  {overBudget
                    ? `${money(Math.abs(remaining))} over budget`
                    : `${money(remaining)} remaining`}
                </span>
              </div>

              {percent >= 80 && !overBudget && (
                <div className="budgetWarning">
                  ⚠ You have used {percent.toFixed(1)}% of your monthly budget.
                </div>
              )}

              {overBudget && (
                <div className="budgetWarning budgetWarningDanger">
                  🚨 You have exceeded your monthly budget by {money(Math.abs(remaining))}.
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default Budgets
