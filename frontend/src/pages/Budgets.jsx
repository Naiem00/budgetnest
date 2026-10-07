import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import {
  deleteCurrentBudget,
  getCurrentBudget,
  saveCurrentBudget,
  updateCurrentBudget,
} from '../api/budgets'
import '../App.css'

const icons = {
  Food: '🍜',
  Housing: '🏠',
  Transport: '🚗',
  Shopping: '🛍️',
  Bills: '🧾',
  Entertainment: '🎬',
  Health: '🏥',
  Other: '💳',
}

function Budgets() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    percent: 0,
  })

  const [category, setCategory] = useState('Food')
  const [amount, setAmount] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadBudgets = useCallback(async (token) => {
    const data = await getCurrentBudget(token)

    setBudgets(data.budgets || [])
    setCategories(data.categories || [])
    setSummary(
      data.summary || {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        percent: 0,
      }
    )
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('budgetnest_token')

    if (!token) {
      navigate('/login')
      return
    }

    Promise.all([
      getCurrentUser(token),
      getCurrentBudget(token),
    ])
      .then(([userData, budgetData]) => {
        setUser(userData.user)
        setBudgets(budgetData.budgets || [])
        setCategories(budgetData.categories || [])
        setSummary(
          budgetData.summary || {
            totalBudget: 0,
            totalSpent: 0,
            remaining: 0,
            percent: 0,
          }
        )
      })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }, [navigate])

  function money(value) {
    const currency = user?.currency_code || 'JPY'

    return new Intl.NumberFormat(
      user?.country_code === 'BD' ? 'en-BD' : 'ja-JP',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      }
    ).format(Number(value) || 0)
  }

  function resetForm() {
    setEditingId(null)
    setCategory('Food')
    setAmount('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const token = localStorage.getItem('budgetnest_token')
    if (!token) return navigate('/login')

    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (editingId) {
        await updateCurrentBudget(
          token,
          editingId,
          category,
          Number(amount)
        )
        setMessage('Budget updated successfully.')
      } else {
        await saveCurrentBudget(
          token,
          category,
          Number(amount)
        )
        setMessage('Budget added successfully.')
      }

      resetForm()
      await loadBudgets(token)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(budget) {
    setEditingId(budget.id)
    setCategory(budget.category)
    setAmount(String(budget.amount))
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this budget?')) return

    const token = localStorage.getItem('budgetnest_token')
    if (!token) return navigate('/login')

    setError('')
    setMessage('')

    try {
      await deleteCurrentBudget(token, id)

      if (editingId === id) {
        resetForm()
      }

      setMessage('Budget deleted.')
      await loadBudgets(token)
    } catch (err) {
      setError(err.message)
    }
  }

  const totalPercent = Number(summary.percent || 0)
  const totalOver = Number(summary.remaining || 0) < 0

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="logo">
            <span className="logoMark">B</span>
            <span>BudgetNest</span>
          </div>

          <nav>
            <button
              className="navItem"
              onClick={() => navigate('/')}
            >
              ▦ Dashboard
            </button>

            <button
              className="navItem"
              onClick={() => navigate('/transactions')}
            >
              ↕ Transactions
            </button>

            <button className="navItem active">
              ◎ Budgets
            </button>

            <button
              className="navItem"
              onClick={() => navigate('/reports')}
            >
              ◔ Reports
            </button>
          </nav>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">MONTHLY PLAN</p>
            <h1>Budgets</h1>
            <p className="muted">
              Set limits for each spending category.
            </p>
          </div>
        </header>

        <section className="stats">
          <article className="statCard">
            <span>Total budget</span>
            <strong>{money(summary.totalBudget)}</strong>
          </article>

          <article className="statCard">
            <span>Total spent</span>
            <strong>{money(summary.totalSpent)}</strong>
          </article>

          <article className="statCard">
            <span>Remaining</span>
            <strong>{money(summary.remaining)}</strong>

            {totalOver && (
              <small className="budgetDanger">
                Overall budget exceeded
              </small>
            )}
          </article>
        </section>

        <section className="panel budgetManagementPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">
                {editingId ? 'EDIT BUDGET' : 'NEW BUDGET'}
              </p>

              <h2>
                {editingId
                  ? 'Update category budget'
                  : '+ Add Budget'}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="cancelTransactionButton"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>

          <form className="budgetForm" onSubmit={handleSubmit}>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              required
            >
              {(categories.length
                ? categories
                : Object.keys(icons)
              ).map((item) => (
                <option key={item} value={item}>
                  {icons[item] || '💳'} {item}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="30000"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
            />

            <button
              className="addButton"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Budget'
                  : '+ Add Budget'}
            </button>
          </form>

          {message && (
            <p className="positive">{message}</p>
          )}

          {error && (
            <p className="auth-error">{error}</p>
          )}
        </section>

        <section className="panel budgetPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">TOTAL BUDGET STATUS</p>
              <h2>
                {money(summary.totalSpent)}
                <span> / {money(summary.totalBudget)}</span>
              </h2>
            </div>

            <strong>{totalPercent.toFixed(1)}%</strong>
          </div>

          <div className="progress">
            <div
              className="progressFill"
              style={{
                width: `${Math.min(totalPercent, 100)}%`,
              }}
            />
          </div>

          <div className="budgetFooter">
            <span>{money(summary.totalSpent)} spent</span>

            <span>
              {totalOver
                ? `${money(
                    Math.abs(summary.remaining)
                  )} over budget`
                : `${money(summary.remaining)} remaining`}
            </span>
          </div>

          {totalPercent >= 80 && !totalOver && (
            <div className="budgetWarning">
              ⚠ You have used {totalPercent.toFixed(1)}% of
              your total monthly budget.
            </div>
          )}

          {totalOver && (
            <div className="budgetWarning budgetWarningDanger">
              🚨 You have exceeded your total budget by{' '}
              {money(Math.abs(summary.remaining))}.
            </div>
          )}
        </section>

        <section className="budgetCategoryGrid">
          {loading ? (
            <article className="panel">
              <p className="muted">Loading budgets...</p>
            </article>
          ) : budgets.length === 0 ? (
            <article className="panel">
              <h2>No category budgets yet</h2>
              <p className="muted">
                Add your first budget above.
              </p>
            </article>
          ) : (
            budgets.map((budget) => {
              const percent = Number(budget.percent || 0)
              const over = budget.status === 'over'
              const warning = budget.status === 'warning'

              return (
                <article
                  className="panel budgetCategoryCard"
                  key={budget.id}
                >
                  <div className="panelHeader">
                    <div>
                      <p className="eyebrow">
                        {icons[budget.category] || '💳'} CATEGORY
                      </p>
                      <h2>{budget.category}</h2>
                    </div>

                    <strong>{percent.toFixed(1)}%</strong>
                  </div>

                  <div className="budgetCategoryAmounts">
                    <div>
                      <span>Spent</span>
                      <strong>{money(budget.spent)}</strong>
                    </div>

                    <div>
                      <span>Limit</span>
                      <strong>{money(budget.amount)}</strong>
                    </div>
                  </div>

                  <div className="progress">
                    <div
                      className="progressFill"
                      style={{
                        width: `${Math.min(percent, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="budgetFooter">
                    <span>
                      {over
                        ? 'Over budget'
                        : warning
                          ? 'Approaching limit'
                          : 'On track'}
                    </span>

                    <span>
                      {over
                        ? `${money(
                            Math.abs(budget.remaining)
                          )} over`
                        : `${money(
                            budget.remaining
                          )} left`}
                    </span>
                  </div>

                  {warning && (
                    <div className="budgetWarning">
                      ⚠ You have used {percent.toFixed(1)}% of
                      this budget.
                    </div>
                  )}

                  {over && (
                    <div className="budgetWarning budgetWarningDanger">
                      🚨 Budget exceeded by{' '}
                      {money(Math.abs(budget.remaining))}.
                    </div>
                  )}

                  <div className="budgetCardActions">
                    <button
                      type="button"
                      onClick={() => startEdit(budget)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="budgetDeleteButton"
                      onClick={() =>
                        handleDelete(budget.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}

export default Budgets
