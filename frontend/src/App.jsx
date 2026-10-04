import './App.css'

const transactions = [
  { id: 1, name: '7-Eleven', category: 'Food', amount: -780, icon: '🍜' },
  { id: 2, name: 'Salary', category: 'Income', amount: 250000, icon: '💼' },
  { id: 3, name: 'ENEOS', category: 'Transport', amount: -4200, icon: '🚗' },
  { id: 4, name: 'Amazon', category: 'Shopping', amount: -3980, icon: '🛍️' },
]

function formatYen(amount) {
  const sign = amount < 0 ? '-' : '+'
  return `${sign}¥${Math.abs(amount).toLocaleString()}`
}

function App() {
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
            <button className="navItem">↕ Transactions</button>
            <button className="navItem">◎ Budgets</button>
            <button className="navItem">◔ Reports</button>
          </nav>
        </div>

        <div className="profile">
          <div className="avatar">N</div>
          <div>
            <strong>Naiem</strong>
            <span>JPY · Japan</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">OCTOBER 2026</p>
            <h1>Good evening 👋</h1>
            <p className="muted">Here's how your money is looking this month.</p>
          </div>

          <button className="addButton">＋ Add transaction</button>
        </header>

        <section className="stats">
          <article className="statCard">
            <span>Monthly income</span>
            <strong>¥250,000</strong>
            <small className="positive">↑ Salary received</small>
          </article>

          <article className="statCard">
            <span>Expenses</span>
            <strong>¥83,420</strong>
            <small>33.4% of income</small>
          </article>

          <article className="statCard">
            <span>Saved</span>
            <strong>¥166,580</strong>
            <small className="positive">66.6% savings rate</small>
          </article>
        </section>

        <section className="grid">
          <article className="panel budgetPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">MONTHLY BUDGET</p>
                <h2>¥83,420 <span>/ ¥120,000</span></h2>
              </div>
              <strong>69.5%</strong>
            </div>

            <div className="progress">
              <div className="progressFill" />
            </div>

            <div className="budgetFooter">
              <span>Spent ¥83,420</span>
              <span>¥36,580 remaining</span>
            </div>
          </article>

          <article className="panel spendingPanel">
            <p className="eyebrow">TOP SPENDING</p>
            <h2>Where your money went</h2>

            <div className="category">
              <span>🏠 Housing</span><strong>¥35,000</strong>
            </div>
            <div className="category">
              <span>🍜 Food</span><strong>¥24,500</strong>
            </div>
            <div className="category">
              <span>🚗 Transport</span><strong>¥12,300</strong>
            </div>
            <div className="category">
              <span>🛍️ Shopping</span><strong>¥7,620</strong>
            </div>
          </article>
        </section>

        <section className="panel transactions">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">ACTIVITY</p>
              <h2>Recent transactions</h2>
            </div>
            <button className="textButton">View all →</button>
          </div>

          {transactions.map((transaction) => (
            <div className="transaction" key={transaction.id}>
              <div className="transactionInfo">
                <div className="transactionIcon">{transaction.icon}</div>
                <div>
                  <strong>{transaction.name}</strong>
                  <span>{transaction.category} · Oct 4</span>
                </div>
              </div>

              <strong className={transaction.amount > 0 ? 'positive' : ''}>
                {formatYen(transaction.amount)}
              </strong>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
