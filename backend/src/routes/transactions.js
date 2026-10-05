import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

/*
 * GET /api/transactions
 * Return transactions belonging only to the logged-in user.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         type,
         amount,
         category,
         merchant,
         payment_method,
         note,
         transaction_date,
         created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC, created_at DESC`,
      [req.user.id]
    )

    res.json({
      transactions: result.rows,
    })
  } catch (error) {
    console.error('Get transactions error:', error)

    res.status(500).json({
      message: 'Unable to load transactions',
    })
  }
})


/*
 * GET /api/transactions/summary
 * Current calendar month's income, expenses and savings.
 */
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(
           SUM(amount) FILTER (WHERE type = 'income'),
           0
         ) AS income,
         COALESCE(
           SUM(amount) FILTER (WHERE type = 'expense'),
           0
         ) AS expenses
       FROM transactions
       WHERE user_id = $1
         AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)::date
         AND transaction_date <
             (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date`,
      [req.user.id]
    )

    const income = Number(result.rows[0].income)
    const expenses = Number(result.rows[0].expenses)

    res.json({
      income,
      expenses,
      savings: income - expenses,
    })
  } catch (error) {
    console.error('Transaction summary error:', error)

    res.status(500).json({
      message: 'Unable to load transaction summary',
    })
  }
})


/*
 * POST /api/transactions
 * Create a transaction for the logged-in user.
 */
router.post('/', async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      merchant,
      paymentMethod,
      note,
      transactionDate,
    } = req.body

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'Type must be income or expense',
      })
    }

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0',
      })
    }

    if (!category?.trim()) {
      return res.status(400).json({
        message: 'Category is required',
      })
    }

    if (
      transactionDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
    ) {
      return res.status(400).json({
        message: 'Transaction date must use YYYY-MM-DD format',
      })
    }

    const result = await pool.query(
      `INSERT INTO transactions (
         user_id,
         type,
         amount,
         category,
         merchant,
         payment_method,
         note,
         transaction_date
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         COALESCE($8::date, CURRENT_DATE)
       )
       RETURNING
         id,
         type,
         amount,
         category,
         merchant,
         payment_method,
         note,
         transaction_date,
         created_at`,
      [
        req.user.id,
        type,
        numericAmount,
        category.trim(),
        merchant?.trim() || null,
        paymentMethod?.trim() || null,
        note?.trim() || null,
        transactionDate || null,
      ]
    )

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: result.rows[0],
    })
  } catch (error) {
    console.error('Create transaction error:', error)

    res.status(500).json({
      message: 'Unable to create transaction',
    })
  }
})



/*
 * PUT /api/transactions/:id
 * Update only a transaction belonging to the logged-in user.
 */
router.put('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid transaction ID',
      })
    }

    const {
      type,
      amount,
      category,
      merchant,
      paymentMethod,
      note,
      transactionDate,
    } = req.body

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'Type must be income or expense',
      })
    }

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0',
      })
    }

    if (!category?.trim()) {
      return res.status(400).json({
        message: 'Category is required',
      })
    }

    if (
      !transactionDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
    ) {
      return res.status(400).json({
        message: 'Transaction date must use YYYY-MM-DD format',
      })
    }

    const result = await pool.query(
      `UPDATE transactions
       SET
         type = $1,
         amount = $2,
         category = $3,
         merchant = $4,
         payment_method = $5,
         note = $6,
         transaction_date = $7::date
       WHERE id = $8
         AND user_id = $9
       RETURNING
         id,
         type,
         amount,
         category,
         merchant,
         payment_method,
         note,
         transaction_date,
         created_at`,
      [
        type,
        numericAmount,
        category.trim(),
        merchant?.trim() || null,
        paymentMethod?.trim() || null,
        note?.trim() || null,
        transactionDate,
        req.params.id,
        req.user.id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Transaction not found',
      })
    }

    res.json({
      message: 'Transaction updated successfully',
      transaction: result.rows[0],
    })
  } catch (error) {
    console.error('Update transaction error:', error)

    res.status(500).json({
      message: 'Unable to update transaction',
    })
  }
})


/*
 * DELETE /api/transactions/:id
 *
 * user_id is part of the DELETE condition.
 * Therefore one user cannot delete another user's transaction.
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid transaction ID',
      })
    }

    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1
         AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Transaction not found',
      })
    }

    res.json({
      message: 'Transaction deleted successfully',
    })
  } catch (error) {
    console.error('Delete transaction error:', error)

    res.status(500).json({
      message: 'Unable to delete transaction',
    })
  }
})

export default router
