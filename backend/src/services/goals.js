import { validDate, validMoney } from './finance.js'

export function validateGoal(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Invalid goal details' }
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 100) return { error: 'Goal name must be 1–100 characters' }
  if (!validMoney(input.targetAmount)) return { error: 'Target must be a positive amount up to 99,999,999.99' }
  const deadline = input.deadline == null || input.deadline === '' ? null : input.deadline
  if (deadline !== null && !validDate(deadline)) return { error: 'Deadline must be a real date (YYYY-MM-DD)' }
  return { title, targetAmount: Number(input.targetAmount), deadline }
}

export function validateGoalAdjustment(input) {
  if (!input || !['add','withdraw'].includes(input.action) || !validMoney(input.amount)) {
    return { error: 'Choose add or withdraw and a valid positive amount' }
  }
  return { signedAmount: (input.action === 'withdraw' ? -1 : 1) * Number(input.amount) }
}

export function presentGoal(goal) {
  const targetAmount = Number(goal.target_amount)
  const savedAmount = Number(goal.saved_amount)
  return {
    id: goal.id,
    title: goal.title,
    targetAmount,
    savedAmount,
    remainingAmount: Math.max(0, targetAmount - savedAmount),
    percent: targetAmount > 0 ? Math.round((savedAmount / targetAmount) * 1000) / 10 : 0,
    currencyCode: goal.currency_code,
    deadline: typeof goal.deadline === 'string' ? goal.deadline.slice(0,10)
      : goal.deadline ? goal.deadline.toISOString().slice(0,10) : null,
    createdAt: goal.created_at,
  }
}
