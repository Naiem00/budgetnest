import { validMoney, validCategory } from './finance.js'
import { parseMonth } from './month.js'

const validText = (x, max) => x == null || (typeof x === 'string' && x.length <= max)

export function validateTemplate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Invalid recurring template' }
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 100) return { error: 'Title must be 1–100 characters' }
  if (!['income','expense'].includes(input.type)) return { error: 'Choose income or expense' }
  if (!validMoney(input.amount)) return { error: 'Enter a positive amount of up to 99,999,999.99' }
  if (!validCategory(input.category)) return { error: 'Category is required (maximum 100 characters)' }
  if (!validText(input.merchant,150) || !validText(input.paymentMethod,50) || !validText(input.note,5000)) {
    return { error: 'Merchant, payment method or note is too long' }
  }
  const day = Number(input.dayOfMonth)
  if (!Number.isInteger(day) || day < 1 || day > 31 || String(input.dayOfMonth ?? '') !== String(day)) {
    return { error: 'Payment day must be 1–31' }
  }
  const startMonth = parseMonth(input.startMonth)
  if (!startMonth) return { error: 'Start month must be YYYY-MM' }
  return {
    title, type: input.type, amount: Number(input.amount), category: input.category.trim(),
    merchant: input.merchant?.trim() || null, paymentMethod: input.paymentMethod?.trim() || null,
    note: input.note?.trim() || null, dayOfMonth: day, startMonth,
  }
}

export function scheduledDate(month, day) {
  if (!parseMonth(month) || !Number.isInteger(day) || day < 1 || day > 31) return null
  const [year,number] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate()
  return `${month}-${String(Math.min(day,lastDay)).padStart(2,'0')}`
}

// Check the due date in the user's configured country, not on the UTC server calendar.
export function todayForCountry(countryCode, date = new Date()) {
  const timeZone = countryCode === 'BD' ? 'Asia/Dhaka' : 'Asia/Tokyo'
  const parts = new Intl.DateTimeFormat('en-US', {
    year:'numeric', month:'2-digit', day:'2-digit',timeZone,
  }).formatToParts(date)
  const part = key => parts.find(x => x.type === key)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function presentTemplate(row) {
  return {
    id: row.id, title: row.title, type: row.type, amount: Number(row.amount),
    currencyCode: row.currency_code, category: row.category, merchant: row.merchant || '',
    paymentMethod: row.payment_method || '', note: row.note || '',dayOfMonth: row.day_of_month,
    startMonth: String(row.start_month).slice(0,7),active: row.active,
    posted: !!row.posted,transactionId: row.transaction_id || null,
  }
}
