import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { checkDatabaseConnection } from './config/database.js'
import authRoutes from './routes/auth.js'
import transactionsRoutes from './routes/transactions.js'
import budgetsRoutes from './routes/budgets.js'
import recurringRoutes from './routes/recurring.js'
import goalsRoutes from './routes/goals.js'
import {requireAuth} from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 3000

// In production require an explicitly configured list of permitted frontend origins.
const allowedOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',').map(x => x.trim().replace(/\/$/, '')).filter(Boolean)
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin))) {
    return callback(null, true)
  }
  callback(new Error('Origin not allowed'))
} }))
app.use(express.json({ limit: '64kb' }))

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'budgetnest-api',
  })
})

app.get('/api/health/db', requireAuth, async (req, res) => {
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
app.use('/api/budgets', budgetsRoutes)
app.use('/api/recurring', recurringRoutes)
app.use('/api/goals', goalsRoutes)

app.use((err,req,res,next) => {
  if (err?.message === 'Origin not allowed') return res.status(403).json({ message:'Origin not allowed' })
  console.error('Unhandled API error',err)
  res.status(500).json({message:'An unexpected server error occurred'})
})

app.listen(PORT, () => {
  console.log(`BudgetNest API running on http://localhost:${PORT}`)
})
