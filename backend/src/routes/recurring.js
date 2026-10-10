import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'
import { parseMonth } from '../services/month.js'
import { validateTemplate, scheduledDate, todayForCountry, presentTemplate } from '../services/recurring.js'

const router = Router()
router.use(requireAuth)
const columns = `id, title, type, amount, currency_code, category, merchant, payment_method,
  note, day_of_month, TO_CHAR(start_month,'YYYY-MM-DD') AS start_month, active`
const validId = v => /^[1-9]\d*$/.test(v) && BigInt(v) <= BigInt('9223372036854775807')

router.get('/', async (req,res) => {
  const month = req.query.month
  if (!parseMonth(month)) return res.status(400).json({message:'Month must use YYYY-MM'})
  try {
    const {rows}=await pool.query(`SELECT t.*, TO_CHAR(t.start_month,'YYYY-MM-DD') AS start_month,
      (p.template_id IS NOT NULL) AS posted, p.transaction_id
      FROM public.recurring_templates t
      LEFT JOIN public.recurring_postings p ON p.template_id=t.id AND p.month=$2::date
      WHERE t.user_id=$1 ORDER BY t.created_at DESC, t.id DESC`,[req.user.id,parseMonth(month)])
    res.json({templates:rows.map(presentTemplate), month})
  } catch(err) { console.error('List recurring failed',err);res.status(500).json({message:'Unable to load recurring payments'}) }
})

router.post('/', async (req,res) => {
  const item=validateTemplate(req.body)
  if (item.error) return res.status(400).json({message:item.error})
  try {
    // A template inherits currency from the account at creation time.
    const {rows}=await pool.query(`INSERT INTO public.recurring_templates
      (user_id,title,type,amount,currency_code,category,merchant,payment_method,note,day_of_month,start_month)
      SELECT id,$2,$3,$4,currency_code,$5,$6,$7,$8,$9,$10::date
      FROM public.users WHERE id=$1 RETURNING ${columns}`,
    [req.user.id,item.title,item.type,item.amount,item.category,item.merchant,item.paymentMethod,item.note,item.dayOfMonth,item.startMonth])
    if (!rows.length) return res.status(401).json({message:'Account not found'})
    res.status(201).json({template:presentTemplate(rows[0])})
  }catch(err) {console.error('Create recurring failed',err);res.status(500).json({message:'Unable to create recurring payment'})}
})

router.patch('/:id', async (req,res) => {
  if (!validId(req.params.id)) return res.status(400).json({message:'Invalid template ID'})
  const item=validateTemplate(req.body)
  if (item.error) return res.status(400).json({message:item.error})
  try {
    const {rows}=await pool.query(`UPDATE public.recurring_templates SET
      title=$1,type=$2,amount=$3,category=$4,merchant=$5,payment_method=$6,
      note=$7,day_of_month=$8,start_month=$9::date,updated_at=NOW()
      WHERE id=$10 AND user_id=$11 RETURNING ${columns}`,
      [item.title,item.type,item.amount,item.category,item.merchant,item.paymentMethod,item.note,item.dayOfMonth,item.startMonth,req.params.id,req.user.id])
    if (!rows.length) return res.status(404).json({message:'Template not found'})
    res.json({template:presentTemplate(rows[0])})
  }catch(err){console.error('Edit recurring failed',err);res.status(500).json({message:'Unable to edit recurring payment'})}
})

router.patch('/:id/status', async (req,res) => {
  if (!validId(req.params.id)) return res.status(400).json({message:'Invalid template ID'})
  if (typeof req.body?.active !== 'boolean') return res.status(400).json({message:'active must be true or false'})
  try {
    const {rows}=await pool.query(`UPDATE public.recurring_templates SET active=$1,updated_at=NOW()
      WHERE id=$2 AND user_id=$3 RETURNING ${columns}`,[req.body.active,req.params.id,req.user.id])
    if (!rows.length) return res.status(404).json({message:'Template not found'})
    res.json({template:presentTemplate(rows[0])})
  }catch(err){console.error('Pause recurring failed',err);res.status(500).json({message:'Unable to change recurring status'})}
})

router.post('/:id/post', async (req,res) => {
  if (!validId(req.params.id)) return res.status(400).json({message:'Invalid template ID'})
  const month = req.body?.month
  if (!parseMonth(month)) return res.status(400).json({message:'Month must use YYYY-MM'})
  const client=await pool.connect().catch(err=>{console.error('DB connection failed',err);return null})
  if (!client) return res.status(500).json({message:'Database unavailable'})
  try {
    await client.query('BEGIN')
    // Serializes simultaneous clicks and prevents double-posting for one template.
    const {rows}=await client.query(`SELECT t.*,TO_CHAR(t.start_month,'YYYY-MM') AS start_month_ym,u.country_code
      FROM public.recurring_templates t JOIN public.users u ON u.id=t.user_id
      WHERE t.id=$1 AND t.user_id=$2 FOR UPDATE OF t`,[req.params.id,req.user.id])
    const t=rows[0]
    if (!t) {await client.query('ROLLBACK');return res.status(404).json({message:'Template not found'})}
    if (!t.active) {await client.query('ROLLBACK');return res.status(409).json({message:'This template is paused'})}
    const due=scheduledDate(month,t.day_of_month)
    const today=todayForCountry(t.country_code)
    const startMonth = t.start_month_ym
    if (month < startMonth || due > today) {
      await client.query('ROLLBACK')
      return res.status(409).json({message:'Payment is not due yet or is earlier than its start month'})
    }
    const existing=await client.query(`SELECT transaction_id FROM public.recurring_postings
      WHERE template_id=$1 AND month=$2::date`,[req.params.id,parseMonth(month)])
    if (existing.rows.length) {await client.query('ROLLBACK');return res.status(409).json({message:'This month was already recorded'})}
    const inserted=await client.query(`INSERT INTO public.transactions
      (user_id,type,amount,currency_code,category,merchant,payment_method,note,transaction_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date)
      RETURNING id,transaction_date,amount,currency_code`,
      [req.user.id,t.type,t.amount,t.currency_code,t.category,t.merchant || t.title,t.payment_method,t.note,due])
    await client.query(`INSERT INTO public.recurring_postings(template_id,month,transaction_id)
      VALUES($1,$2::date,$3)`,[req.params.id,parseMonth(month),inserted.rows[0].id])
    await client.query('COMMIT')
    res.status(201).json({message:'Monthly transaction recorded',transaction:inserted.rows[0]})
  }catch(err) {await client.query('ROLLBACK').catch(()=>{});console.error('Post recurring failed',err);res.status(500).json({message:'Unable to record monthly transaction'})}
  finally {client.release()}
})

export default router
