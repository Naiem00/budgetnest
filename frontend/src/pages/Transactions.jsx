import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import {
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '../api/transactions'
import { filterTransactions } from '../utils/transactions'
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

function Transactions() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sort, setSort] = useState('date-desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    merchant: '',
    paymentMethod: 'Cash',
    note: '',
    transactionDate: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('budgetnest_token')

    if (!token) {
      navigate('/login')
      return
    }

    async function loadPage() {
      try {
        const [userData, transactionData] = await Promise.all([
          getCurrentUser(token),
          getTransactions(token),
        ])

        setUser(userData.user)
        setTransactions(transactionData.transactions)
      } catch (err) {
        setError(err.message || 'Unable to load transactions')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [navigate])

  const categories = useMemo(() => [...new Set(transactions.map(t => t.category))].sort(), [transactions])
  const filteredTransactions = useMemo(() => filterTransactions(transactions, {
    type: filter, category: categoryFilter, from: startDate,
    to: endDate, query, sort,
  }), [transactions,filter,categoryFilter,startDate,endDate,query,sort])

  const countryName =
    user?.country_code === 'JP'
      ? 'Japan'
      : user?.country_code === 'BD'
        ? 'Bangladesh'
        : user?.country_code || ''

  function formatMoney(amount, type, recordCurrency) {
    const currency = recordCurrency || user?.currency_code || 'JPY'
    const numericAmount = Number(amount) || 0

    const formatted = new Intl.NumberFormat(
      user?.country_code === 'BD' ? 'en-BD' : 'ja-JP',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      }
    ).format(Math.abs(numericAmount))

    return `${type === 'expense' ? '-' : '+'}${formatted}`
  }

  function formatDate(value) {
    if (!value) return ''

    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone:
        user?.country_code === 'BD' ? 'Asia/Dhaka' : 'Asia/Tokyo',
    }).format(new Date(value))
  }

  function dateForInput(value) {
    if (!value) return ''

    const timeZone =
      user?.country_code === 'BD' ? 'Asia/Dhaka' : 'Asia/Tokyo'

    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).formatToParts(new Date(value))

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    )

    return `${values.year}-${values.month}-${values.day}`
  }

  function startEdit(transaction) {
    setError('')

    setForm({
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      merchant: transaction.merchant || '',
      paymentMethod: transaction.payment_method || '',
      note: transaction.note || '',
      transactionDate: dateForInput(transaction.transaction_date),
    })

    setEditing(transaction)
  }

  async function handleUpdate(event) {
    event.preventDefault()

    const token = localStorage.getItem('budgetnest_token')

    if (!token || !editing) return

    setSaving(true)
    setError('')

    try {
      const data = await updateTransaction(
        token,
        editing.id,
        {
          type: form.type,
          amount: Number(form.amount),
          category: form.category,
          merchant: form.merchant,
          paymentMethod: form.paymentMethod,
          note: form.note,
          transactionDate: form.transactionDate,
        }
      )

      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === editing.id
            ? data.transaction
            : transaction
        )
      )

      setEditing(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(transaction) {
    const name =
      transaction.merchant || transaction.category

    const confirmed = window.confirm(
      `Delete "${name}" transaction? This cannot be undone.`
    )

    if (!confirmed) return

    const token = localStorage.getItem('budgetnest_token')

    try {
      await deleteTransaction(token, transaction.id)

      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id)
      )
    } catch (err) {
      window.alert(err.message)
    }
  }

  function handleLogout() {
    localStorage.removeItem('budgetnest_token')
    navigate('/login')
  }

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

            <button className="navItem active">
              ↕ Transactions
            </button>

            <button className="navItem" onClick={() => navigate('/budgets')}>◎ Budgets</button>
            <button className="navItem" onClick={() => navigate('/reports')}>◔ Reports</button>
            <button className="navItem" onClick={() => navigate('/settings')}>⚙ Settings</button>
          </nav>
        </div>

        <div className="profile">
          <div className="avatar">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>

          <div className="profileDetails">
            <strong>{user?.name || 'Loading...'}</strong>

            <span>
              {user
                ? `${user.currency_code} · ${countryName}`
                : 'Loading...'}
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
            <p className="eyebrow">MONEY HISTORY</p>
            <h1>Transactions</h1>
            <p className="muted">
              View and manage your previous records.
            </p>
          </div>

          <button
            className="addButton"
            onClick={() => navigate('/')}
          >
            ＋ Add from dashboard
          </button>
        </header>

        <section className="transactionHistoryToolbar">
          <div className="transactionFilters">
            <button
              className={filter === 'all' ? 'filterButton active' : 'filterButton'}
              onClick={() => setFilter('all')}
            >
              All
            </button>

            <button
              className={filter === 'income' ? 'filterButton active' : 'filterButton'}
              onClick={() => setFilter('income')}
            >
              Income
            </button>

            <button
              className={filter === 'expense' ? 'filterButton active' : 'filterButton'}
              onClick={() => setFilter('expense')}
            >
              Expenses
            </button>
          </div>

          <span className="muted">
            {filteredTransactions.length} record
            {filteredTransactions.length === 1 ? '' : 's'}
          </span>
        </section>

        <section className="filterGrid" aria-label="Transaction search and filters">
          <label>Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Merchant, note, amount..." /></label>
          <label>Category<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>From<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} /></label>
          <label>To<input type="date" min={startDate||undefined} value={endDate} onChange={e=>setEndDate(e.target.value)} /></label>
          <label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></select></label>
        </section>
        <section className="panel transactionHistoryPanel">
          {loading ? (
            <p className="muted">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <div className="emptyTransactions">
              <h2>No transactions found</h2>
              <p className="muted">
                Your transaction history will appear here.
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                className="historyTransaction"
                key={transaction.id}
              >
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
                      {formatDate(transaction.transaction_date)}
                    </span>
                  </div>
                </div>

                <div className="historyTransactionRight">
                  <strong
                    className={
                      transaction.type === 'income'
                        ? 'positive'
                        : ''
                    }
                  >
                    {formatMoney(
                      transaction.amount,
                      transaction.type, transaction.currency_code
                    )}
                  </strong>

                  <div className="transactionActions">
                    <button
                      className="editTransactionButton"
                      onClick={() => startEdit(transaction)}
                    >
                      Edit
                    </button>

                    <button
                      className="deleteTransactionButton"
                      onClick={() => handleDelete(transaction)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {editing && (
        <div
          className="transactionModalBackdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditing(null)
            }
          }}
        >
          <div
            className="transactionModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-transaction-title"
          >
            <div className="transactionModalHeader">
              <div>
                <p className="eyebrow">EDIT RECORD</p>
                <h2 id="edit-transaction-title">
                  Edit transaction
                </h2>
              </div>

              <button
                className="modalCloseButton"
                type="button"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>

            <form
              className="transactionForm"
              onSubmit={handleUpdate}
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
                  value={form.note}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      note: event.target.value,
                    })
                  }
                />
              </label>

              {error && (
                <p className="auth-error transactionFormFull">
                  {error}
                </p>
              )}

              <div className="transactionFormActions transactionFormFull">
                <button
                  type="button"
                  className="cancelTransactionButton"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="addButton"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transactions
