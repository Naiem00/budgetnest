export const expenseCategories = Object.freeze(['Food','Housing','Transport','Shopping','Bills','Entertainment','Health','Other'])

export function validMoney(input) {
  const value = String(input ?? '')
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) return false
  const n = Number(value)
  return Number.isFinite(n) && n > 0 && n <= 99999999.99
}
export function validDate(input) {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false
  const [y,m,d] = input.split('-').map(Number)
  const dt = new Date(Date.UTC(y,m-1,d))
  return dt.getUTCFullYear()===y && dt.getUTCMonth()===m-1 && dt.getUTCDate()===d
}
export function validCategory(input) {
  return typeof input === 'string' && input.trim().length > 0 && input.trim().length <= 100
}
