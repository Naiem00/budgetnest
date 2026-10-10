import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)
export const CATEGORIES = ['Food','Housing','Transport','Shopping','Bills','Entertainment','Health','Other']

export function budgetMonth(value) {
  if (!value) return new Date().toISOString().slice(0,7) + '-01'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null
  return value + '-01'
}
function payload(req, res) {
  const category = typeof req.body?.category === 'string' ? req.body?.category.trim() : ''
  const amount = Number(req.body?.amount)
  if (!CATEGORIES.includes(category) || !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 || !/^\d+(\.\d{1,2})?$/.test(String(req.body?.amount))) {
    res.status(400).json({ message:'Choose a category and a positive budget amount (up to 2 decimals)' })
    return null
  }
  return {category, amount}
}
function monthValue(req,res) {
  const month = budgetMonth(req.query.month)
  if (!month) res.status(400).json({ message:'Month must be YYYY-MM' })
  return month
}
async function list(req,res) {
  const month=monthValue(req,res); if (!month) return
  try {
    const {rows} = await pool.query(`
      SELECT b.id,b.month,b.category,b.amount,b.currency_code,b.created_at,
             COALESCE(SUM(t.amount),0) AS spent
      FROM budgets b LEFT JOIN transactions t
        ON t.user_id=b.user_id AND t.type='expense' AND t.category=b.category
        AND t.transaction_date >= b.month AND t.transaction_date < b.month + INTERVAL '1 month'
        AND t.currency_code=b.currency_code
      WHERE b.user_id=$1 AND b.month=$2::date AND b.currency_code=(SELECT currency_code FROM users WHERE id=$1)
      GROUP BY b.id,b.month,b.category,b.amount,b.currency_code,b.created_at
      ORDER BY b.category`, [req.user.id,month])
    const budgets=rows.map(b=>{
      const amount=Number(b.amount), spent=Number(b.spent), remaining=amount-spent
      const percent=amount>0 ? spent/amount*100 : 0
      return {...b, amount,spent,remaining,percent,status:percent>=100?'over':percent>=80?'warning':'good'}
    })
    const totalBudget=budgets.reduce((s,b)=>s+b.amount,0)
    const totalSpent=budgets.reduce((s,b)=>s+b.spent,0)
    res.json({month:month.slice(0,7),budgets,categories:CATEGORIES,summary:{totalBudget,totalSpent,remaining:totalBudget-totalSpent,percent:totalBudget>0?totalSpent/totalBudget*100:0}})
  } catch(err) { console.error('Budget list error',err); res.status(500).json({message:'Unable to load budgets; check that migration 003 has been applied'}) }
}
async function save(req,res) {
  const month=monthValue(req,res);if(!month)return
  const data=payload(req,res);if(!data)return
  try {
    const {rows}=await pool.query(`INSERT INTO budgets(user_id,month,category,amount,currency_code) VALUES($1,$2::date,$3,$4,(SELECT currency_code FROM users WHERE id=$1)) ON CONFLICT(user_id,month,category,currency_code) DO UPDATE SET amount=EXCLUDED.amount RETURNING id,month,category,amount,currency_code,created_at`,[req.user.id,month,data.category,data.amount])
    res.json({message:'Budget saved',budget:rows[0]})
  }catch(err){console.error('Budget save error',err);res.status(500).json({message:'Unable to save budget'})}
}
async function update(req,res) {
  const month=monthValue(req,res);if(!month)return
  if(!/^\d+$/.test(req.params.id))return res.status(400).json({message:'Invalid budget ID'})
  const data=payload(req,res);if(!data)return
  try{
    const {rows}=await pool.query('UPDATE budgets SET category=$1,amount=$2 WHERE id=$3 AND user_id=$4 AND month=$5::date AND currency_code=(SELECT currency_code FROM users WHERE id=$4) RETURNING id,month,category,amount,currency_code,created_at',[data.category,data.amount,req.params.id,req.user.id,month])
    if(!rows.length)return res.status(404).json({message:'Budget not found'})
    res.json({message:'Budget updated',budget:rows[0]})
  }catch(err){if(err.code==='23505')return res.status(409).json({message:'A budget for that category already exists'});console.error('Budget update error',err);res.status(500).json({message:'Unable to update budget'})}
}
async function remove(req,res) {
  const month=monthValue(req,res);if(!month)return
  if(!/^\d+$/.test(req.params.id))return res.status(400).json({message:'Invalid budget ID'})
  try{
    const {rows}=await pool.query('DELETE FROM budgets WHERE id=$1 AND user_id=$2 AND month=$3::date AND currency_code=(SELECT currency_code FROM users WHERE id=$2) RETURNING id',[req.params.id,req.user.id,month])
    if(!rows.length)return res.status(404).json({message:'Budget not found'})
    res.json({message:'Budget deleted'})
  }catch(err){console.error('Budget delete error',err);res.status(500).json({message:'Unable to delete budget'})}
}
router.get('/',list);router.get('/current',list)
router.post('/',save);router.post('/current',save)
router.put('/:id',update);router.put('/current/:id',update)
router.delete('/:id',remove);router.delete('/current/:id',remove)
export default router
