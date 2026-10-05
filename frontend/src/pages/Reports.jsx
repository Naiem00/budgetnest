import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api/auth'
import { getTransactions, getTransactionSummary } from '../api/transactions'
import '../App.css'

function Reports() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0 })

  useEffect(() => {
    const token = localStorage.getItem('budgetnest_token')
    if (!token) return navigate('/login')

    Promise.all([
      getCurrentUser(token),
      getTransactions(token),
      getTransactionSummary(token),
    ])
      .then(([userData, transactionData, summaryData]) => {
        setUser(userData.user)
        setTransactions(transactionData.transactions)
        setSummary(summaryData)
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

  const categories = useMemo(() => {
    const totals = {}

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
      })

    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [transactions])

  const savingsRate =
    summary.income > 0
      ? (summary.savings / summary.income) * 100
      : 0

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
            <button className="navItem" onClick={() => navigate('/budgets')}>◎ Budgets</button>
            <button className="navItem active">◔ Reports</button>
          </nav>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">MONTHLY ANALYSIS</p>
            <h1>Reports</h1>
            <p className="muted">A simple overview of your finances this month.</p>
          </div>
        </header>

        <section className="stats">
          <article className="statCard">
            <span>Income</span>
            <strong>{money(summary.income)}</strong>
          </article>

          <article className="statCard">
            <span>Expenses</span>
            <strong>{money(summary.expenses)}</strong>
          </article>

          <article className="statCard">
            <span>Savings</span>
            <strong>{money(summary.savings)}</strong>
            <small>{savingsRate.toFixed(1)}% savings rate</small>
          </article>
        </section>

        <section className="panel reportPanel">
          <p className="eyebrow">CATEGORY BREAKDOWN</p>
          <h2>Spending by category</h2>

          {categories.length === 0 ? (
            <p className="muted">No expense data available yet.</p>
          ) : (
            categories.map(([category, amount]) => {
              const percent =
                summary.expenses > 0
                  ? (amount / summary.expenses) * 100
                  : 0

              return (
                <div className="reportCategory" key={category}>
                  <div className="reportCategoryHeader">
                    <strong>{category}</strong>
                    <span>{money(amount)} · {percent.toFixed(1)}%</span>
                  </div>

                  <div className="progress">
                    <div
                      className="progressFill"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}

export default Reports
