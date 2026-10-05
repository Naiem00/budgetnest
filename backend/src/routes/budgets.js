import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

/*
 * GET /api/budgets/current
 * Get the logged-in user's budget for the current month.
 */
router.get('/current', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, month, amount, created_at
       FROM budgets
       WHERE user_id = $1
         AND month = DATE_TRUNC('month', CURRENT_DATE)::date`,
      [req.user.id]
    )

    res.json({
      budget: result.rows[0] || null,
    })
  } catch (error) {
    console.error('Get budget error:', error)

    res.status(500).json({
      message: 'Unable to load budget',
    })
  }
})

/*
 * PUT /api/budgets/current
 * Create or update the current month's budget.
 */
router.put('/current', async (req, res) => {
  try {
    const amount = Number(req.body.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Budget amount must be greater than 0',
      })
    }

    const result = await pool.query(
      `INSERT INTO budgets (
         user_id,
         month,
         amount
       )
       VALUES (
         $1,
         DATE_TRUNC('month', CURRENT_DATE)::date,
         $2
       )
       ON CONFLICT (user_id, month)
       DO UPDATE SET amount = EXCLUDED.amount
       RETURNING id, month, amount, created_at`,
      [req.user.id, amount]
    )

    res.json({
      message: 'Budget saved successfully',
      budget: result.rows[0],
    })
  } catch (error) {
    console.error('Save budget error:', error)

    res.status(500).json({
      message: 'Unable to save budget',
    })
  }
})

export default router
