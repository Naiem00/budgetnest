import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { checkDatabaseConnection } from './config/database.js'
import authRoutes from './routes/auth.js'
import transactionsRoutes from './routes/transactions.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'budgetnest-api',
  })
})

app.get('/api/health/db', async (req, res) => {
  try {
    const database = await checkDatabaseConnection()

    res.json({
      status: 'ok',
      database,
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionsRoutes)

app.listen(PORT, () => {
  console.log(`BudgetNest API running on http://localhost:${PORT}`)
})
