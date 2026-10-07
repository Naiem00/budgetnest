import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import { getCurrentBudget } from '../api/budgets'
import {
  createTransaction,
  getTransactions,
  getTransactionSummary,
} from '../api/transactions'
import '../App.css'

const categoryIcons = {
  Housing: '🏠',
  Food: '🍜',
  Transport: '🚗',
  Shopping: '🛍️',
  Salary: '💼',
  Bills: '🧾',
  Entertainment: '🎬',
  Health: '🏥',
  Other: '💳',
}

function App() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [budget, setBudget] = useState(null)
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
  })

  const [loading, setLoading] = useState(true)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [savingTransaction, setSavingTransaction] = useState(false)
  const [transactionError, setTransactionError] = useState('')

  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    merchant: '',
    paymentMethod: 'Cash',
    note: '',
    transactionDate: new Date().toLocaleDateString('en-CA'),
  })

  const loadFinancialData = useCallback(async (token) => {
    const [transactionsData, summaryData, budgetData] = await Promise.all([
      getTransactions(token),
      getTransactionSummary(token),
      getCurrentBudget(token),
    ])

    setTransactions(transactionsData.transactions)
    setSummary(summaryData)
    setBudget(budgetData.summary)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('budgetnest_token')

    if (!token) {
      navigate('/login')
      return
    }

    async function loadDashboard() {
      try {
        const userData = await getCurrentUser(token)
        setUser(userData.user)

        await loadFinancialData(token)
      } catch {
        localStorage.removeItem('budgetnest_token')
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [navigate, loadFinancialData])

  function handleLogout() {
    localStorage.removeItem('budgetnest_token')
    navigate('/login')
  }

  function formatMoney(amount, showSign = false) {
    const currency = user?.currency_code || 'JPY'
    const numericAmount = Number(amount) || 0

    const formatted = new Intl.NumberFormat(
      user?.country_code === 'BD' ? 'en-BD' : 'ja-JP',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      }
    ).format(Math.abs(numericAmount))

    if (!showSign) {
      return numericAmount < 0 ? `-${formatted}` : formatted
    }

    return `${numericAmount < 0 ? '-' : '+'}${formatted}`
  }

  function formatTransactionDate(value) {
    if (!value) return ''

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      timeZone:
        user?.country_code === 'BD' ? 'Asia/Dhaka' : 'Asia/Tokyo',
    }).format(new Date(value))
  }

  async function handleAddTransaction(event) {
    event.preventDefault()

    const token = localStorage.getItem('budgetnest_token')

    if (!token) {
      navigate('/login')
      return
    }

    setSavingTransaction(true)
    setTransactionError('')

    try {
      await createTransaction(token, {
        type: form.type,
        amount: Number(form.amount),
        category: form.category,
        merchant: form.merchant,
        paymentMethod: form.paymentMethod,
        note: form.note,
        transactionDate: form.transactionDate,
      })

      await loadFinancialData(token)

      setForm({
        type: 'expense',
        amount: '',
        category: 'Food',
        merchant: '',
        paymentMethod: 'Cash',
        note: '',
        transactionDate: new Date().toLocaleDateString('en-CA'),
      })

      setShowTransactionForm(false)
    } catch (error) {
      setTransactionError(error.message)
    } finally {
      setSavingTransaction(false)
    }
  }

  const countryName =
    user?.country_code === 'JP'
      ? 'Japan'
      : user?.country_code === 'BD'
        ? 'Bangladesh'
        : user?.country_code || ''

  const budgetAmount = Number(budget?.totalBudget || 0)
  const budgetSpent = Number(budget?.totalSpent || 0)
  const budgetRemaining = Number(budget?.remaining || 0)
  const budgetPercent = Number(budget?.percent || 0)
  const isOverBudget = budgetRemaining < 0

  const expensePercent =
    summary.income > 0
      ? (summary.expenses / summary.income) * 100
      : 0

  const savingsRate =
    summary.income > 0
      ? (summary.savings / summary.income) * 100
      : 0

  const spendingByCategory = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((totals, transaction) => {
      totals[transaction.category] =
        (totals[transaction.category] || 0) + Number(transaction.amount)

      return totals
    }, {})

  const topSpending = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="logo">
            <span className="logoMark">B</span>
            <span>BudgetNest</span>
          </div>

          <nav>
            <button className="navItem active">▦ Dashboard</button>
            <button
              className="navItem"
              onClick={() => navigate('/transactions')}
            >
              ↕ Transactions
            </button>
            <button className="navItem" onClick={() => navigate('/budgets')}>◎ Budgets</button>
            <button className="navItem" onClick={() => navigate('/reports')}>◔ Reports</button>
          </nav>
        </div>

        <div className="profile">
          <div className="avatar">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>

          <div className="profileDetails">
            <strong>{user?.name || 'Loading...'}</strong>
            <span>
              {user ? `${user.currency_code} · ${countryName}` : 'Loading...'}
            </span>

            <button
              type="button"
              className="logoutButton"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {new Intl.DateTimeFormat('en', {
                month: 'long',
                year: 'numeric',
              }).format(new Date()).toUpperCase()}
            </p>

            <h1>Good evening 👋</h1>
            <p className="muted">
              Here's how your money is looking this month.
            </p>
          </div>

          <button
            className="addButton"
            onClick={() => {
              setTransactionError('')
              setShowTransactionForm(true)
            }}
          >
            ＋ Add transaction
          </button>
        </header>

        <section className="stats">
          <article className="statCard">
            <span>Monthly income</span>
            <strong>{formatMoney(summary.income)}</strong>
            <small className="positive">
              {summary.income > 0 ? 'Income recorded' : 'No income yet'}
            </small>
          </article>

          <article className="statCard">
            <span>Expenses</span>
            <strong>{formatMoney(summary.expenses)}</strong>
            <small>
              {summary.income > 0
                ? `${expensePercent.toFixed(1)}% of income`
                : 'Add income to see percentage'}
            </small>
          </article>

          <article className="statCard">
            <span>Saved</span>
            <strong>{formatMoney(summary.savings)}</strong>
            <small className={summary.savings >= 0 ? 'positive' : ''}>
              {summary.income > 0
                ? `${savingsRate.toFixed(1)}% savings rate`
                : 'Income minus expenses'}
            </small>
          </article>
        </section>

        <section className="grid">
          <article className="panel budgetPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">MONTHLY BUDGET</p>
                <h2>
                  {formatMoney(budgetSpent)}
                  {budgetAmount > 0 && <span> / {formatMoney(budgetAmount)}</span>}
                </h2>
              </div>

              <strong>
                {budgetAmount > 0
                  ? `${budgetPercent.toFixed(1)}%`
                  : '—'}
              </strong>
            </div>

            <div className="progress">
              <div
                className="progressFill"
                style={{
                  width: `${Math.min(budgetPercent, 100)}%`,
                }}
              />
            </div>

            <div className="budgetFooter">
              <span>Spent {formatMoney(budgetSpent)}</span>
              <span>
                {budgetAmount > 0
                  ? isOverBudget
                    ? `${formatMoney(Math.abs(budgetRemaining))} over budget`
                    : `${formatMoney(budgetRemaining)} remaining`
                  : 'Set category budgets'}
              </span>
            </div>
          </article>

          <article className="panel spendingPanel">
            <p className="eyebrow">TOP SPENDING</p>
            <h2>Where your money went</h2>

            {topSpending.length === 0 ? (
              <p className="muted">No expense data yet.</p>
            ) : (
              topSpending.map(([category, amount]) => (
                <div className="category" key={category}>
                  <span>
                    {categoryIcons[category] || '💳'} {category}
                  </span>
                  <strong>{formatMoney(amount)}</strong>
                </div>
              ))
            )}
          </article>
        </section>

        <section className="panel transactions">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">ACTIVITY</p>
              <h2>Recent transactions</h2>
            </div>

            <span className="muted">
              {transactions.length} total
            </span>
          </div>

          {loading ? (
            <p className="muted">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="muted">
              No transactions yet. Add your first one.
            </p>
          ) : (
            transactions.slice(0, 5).map((transaction) => {
              const amount =
                transaction.type === 'income'
                  ? Number(transaction.amount)
                  : -Number(transaction.amount)

              return (
                <div className="transaction" key={transaction.id}>
                  <div className="transactionInfo">
                    <div className="transactionIcon">
                      {categoryIcons[transaction.category] || '💳'}
                    </div>

                    <div>
                      <strong>
                        {transaction.merchant ||
                          transaction.category}
                      </strong>

                      <span>
                        {transaction.category} ·{' '}
                        {formatTransactionDate(
                          transaction.transaction_date
                        )}
                      </span>
                    </div>
                  </div>

                  <strong
                    className={amount > 0 ? 'positive' : ''}
                  >
                    {formatMoney(amount, true)}
                  </strong>
                </div>
              )
            })
          )}
        </section>
      </main>

      {showTransactionForm && (
        <div
          className="transactionModalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowTransactionForm(false)
            }
          }}
        >
          <div
            className="transactionModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-transaction-title"
          >
            <div className="transactionModalHeader">
              <div>
                <p className="eyebrow">NEW ENTRY</p>
                <h2 id="add-transaction-title">Add transaction</h2>
              </div>

              <button
                type="button"
                className="modalCloseButton"
                onClick={() => setShowTransactionForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              className="transactionForm"
              onSubmit={handleAddTransaction}
            >
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value,
                    })
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="1200"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      amount: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                >
                  <option>Food</option>
                  <option>Housing</option>
                  <option>Transport</option>
                  <option>Shopping</option>
                  <option>Salary</option>
                  <option>Bills</option>
                  <option>Entertainment</option>
                  <option>Health</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Merchant / source
                <input
                  type="text"
                  placeholder={
                    form.type === 'income'
                      ? 'Company'
                      : '7-Eleven'
                  }
                  value={form.merchant}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      merchant: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Payment method
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentMethod: event.target.value,
                    })
                  }
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank transfer</option>
                  <option>PayPay</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  required
                  value={form.transactionDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      transactionDate: event.target.value,
                    })
                  }
                />
              </label>

              <label className="transactionFormFull">
                Note
                <textarea
                  rows="3"
                  placeholder="Optional note"
                  value={form.note}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      note: event.target.value,
                    })
                  }
                />
              </label>

              {transactionError && (
                <p className="auth-error transactionFormFull">
                  {transactionError}
                </p>
              )}

              <div className="transactionFormActions transactionFormFull">
                <button
                  type="button"
                  className="cancelTransactionButton"
                  onClick={() => setShowTransactionForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="addButton"
                  disabled={savingTransaction}
                >
                  {savingTransaction
                    ? 'Saving...'
                    : 'Save transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
