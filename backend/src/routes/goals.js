import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'
import { presentGoal, validateGoal, validateGoalAdjustment } from '../services/goals.js'

const router = Router()
router.use(requireAuth)
const selection = `id, title, target_amount, saved_amount, currency_code, TO_CHAR(deadline, 'YYYY-MM-DD') AS deadline, created_at`

function goalId(req, res) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    res.status(400).json({ message: 'Invalid goal ID' })
    return false
  }
  return true
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${selection} FROM public.savings_goals WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    )
    res.json({ goals: rows.map(presentGoal) })
  } catch (err) {
    console.error('List savings goals failed:', err)
    res.status(500).json({ message: 'Unable to load savings goals' })
  }
})

router.post('/', async (req, res) => {
  const data = validateGoal(req.body)
  if (data.error) return res.status(400).json({ message: data.error })
  try {
    // Currency is assigned by the server and stored on the goal, not trusted from the browser.
    const { rows } = await pool.query(
      `INSERT INTO public.savings_goals (user_id, title, target_amount, currency_code, deadline)
       SELECT id, $2, $3, currency_code, $4::date FROM public.users WHERE id = $1
       RETURNING ${selection}`,
      [req.user.id, data.title, data.targetAmount, data.deadline]
    )
    if (!rows.length) return res.status(401).json({ message: 'Account not found' })
    res.status(201).json({ goal: presentGoal(rows[0]) })
  } catch (err) {
    console.error('Create savings goal failed:', err)
    res.status(500).json({ message: 'Unable to create savings goal' })
  }
})

router.patch('/:id', async (req, res) => {
  if (!goalId(req, res)) return
  const data = validateGoal(req.body)
  if (data.error) return res.status(400).json({ message: data.error })
  try {
    const { rows } = await pool.query(
      `UPDATE public.savings_goals
       SET title=$1, target_amount=$2, deadline=$3::date, updated_at=NOW()
       WHERE id=$4 AND user_id=$5 RETURNING ${selection}`,
      [data.title, data.targetAmount, data.deadline, req.params.id, req.user.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Goal not found' })
    res.json({ goal: presentGoal(rows[0]) })
  } catch (err) {
    console.error('Update savings goal failed:', err)
    res.status(500).json({ message: 'Unable to update savings goal' })
  }
})

router.post('/:id/adjustments', async (req, res) => {
  if (!goalId(req, res)) return
  const data = validateGoalAdjustment(req.body)
  if (data.error) return res.status(400).json({ message: data.error })
  try {
    // Atomic conditional update: concurrent withdrawals cannot make saved_amount negative.
    const { rows } = await pool.query(
      `UPDATE public.savings_goals
       SET saved_amount = saved_amount + $1::numeric, updated_at=NOW()
       WHERE id=$2 AND user_id=$3 AND saved_amount + $1::numeric >= 0
       RETURNING ${selection}`,
      [data.signedAmount, req.params.id, req.user.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Goal not found or insufficient saved amount' })
    res.json({ goal: presentGoal(rows[0]) })
  } catch (err) {
    console.error('Adjust savings goal failed:', err)
    res.status(500).json({ message: 'Unable to update saved amount' })
  }
})

router.delete('/:id', async (req, res) => {
  if (!goalId(req, res)) return
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM public.savings_goals WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    )
    if (!rowCount) return res.status(404).json({ message: 'Goal not found' })
    res.json({ message: 'Goal deleted' })
  } catch (err) {
    console.error('Delete savings goal failed:', err)
    res.status(500).json({ message: 'Unable to delete savings goal' })
  }
})

export default router
