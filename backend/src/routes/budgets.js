import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const DEFAULT_CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Other',
]

router.get('/current', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.month,
        b.category,
        b.amount,
        b.created_at,
        COALESCE(SUM(t.amount), 0) AS spent
      FROM budgets b
      LEFT JOIN transactions t
        ON t.user_id = b.user_id
        AND t.type = 'expense'
        AND t.category = b.category
        AND t.transaction_date >= b.month
        AND t.transaction_date < b.month + INTERVAL '1 month'
      WHERE b.user_id = $1
        AND b.month = DATE_TRUNC('month', CURRENT_DATE)::date
      GROUP BY b.id, b.month, b.category, b.amount, b.created_at
      ORDER BY b.category
      `,
      [req.user.id]
    )

    const budgets = result.rows.map((budget) => {
      const amount = Number(budget.amount)
      const spent = Number(budget.spent)
      const remaining = amount - spent
      const percent = amount > 0 ? (spent / amount) * 100 : 0

      return {
        ...budget,
        amount,
        spent,
        remaining,
        percent,
        status:
          percent >= 100
            ? 'over'
            : percent >= 80
              ? 'warning'
              : 'good',
      }
    })

    const totalBudget = budgets.reduce(
      (sum, budget) => sum + budget.amount,
      0
    )

    const totalSpent = budgets.reduce(
      (sum, budget) => sum + budget.spent,
      0
    )

    res.json({
      budgets,
      categories: DEFAULT_CATEGORIES,
      summary: {
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
        percent:
          totalBudget > 0
            ? (totalSpent / totalBudget) * 100
            : 0,
      },
    })
  } catch (error) {
    console.error('Get budgets error:', error)
    res.status(500).json({ message: 'Unable to load budgets' })
  }
})

router.post('/current', async (req, res) => {
  try {
    const category = String(req.body.category || '').trim()
    const amount = Number(req.body.amount)

    if (!category) {
      return res.status(400).json({ message: 'Category is required' })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Budget amount must be greater than 0',
      })
    }

    const result = await pool.query(
      `
      INSERT INTO budgets (user_id, month, category, amount)
      VALUES (
        $1,
        DATE_TRUNC('month', CURRENT_DATE)::date,
        $2,
        $3
      )
      ON CONFLICT (user_id, month, category)
      DO UPDATE SET amount = EXCLUDED.amount
      RETURNING id, month, category, amount, created_at
      `,
      [req.user.id, category, amount]
    )

    res.json({
      message: 'Budget saved successfully',
      budget: result.rows[0],
    })
  } catch (error) {
    console.error('Save budget error:', error)
    res.status(500).json({ message: 'Unable to save budget' })
  }
})

router.put('/current/:id', async (req, res) => {
  try {
    const category = String(req.body.category || '').trim()
    const amount = Number(req.body.amount)

    if (!category) {
      return res.status(400).json({ message: 'Category is required' })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Budget amount must be greater than 0',
      })
    }

    const result = await pool.query(
      `
      UPDATE budgets
      SET category = $1, amount = $2
      WHERE id = $3
        AND user_id = $4
        AND month = DATE_TRUNC('month', CURRENT_DATE)::date
      RETURNING id, month, category, amount, created_at
      `,
      [category, amount, req.params.id, req.user.id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Budget not found' })
    }

    res.json({
      message: 'Budget updated successfully',
      budget: result.rows[0],
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A budget for this category already exists',
      })
    }

    console.error('Update budget error:', error)
    res.status(500).json({ message: 'Unable to update budget' })
  }
})

router.delete('/current/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM budgets
      WHERE id = $1
        AND user_id = $2
        AND month = DATE_TRUNC('month', CURRENT_DATE)::date
      RETURNING id
      `,
      [req.params.id, req.user.id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Budget not found' })
    }

    res.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Delete budget error:', error)
    res.status(500).json({ message: 'Unable to delete budget' })
  }
})

export default router
