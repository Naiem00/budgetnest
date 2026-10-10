// Use calendar-local components, not UTC ISO strings (which can shift months near midnight).
export function localMonth(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
export function localDay(date = new Date()) {
  return `${localMonth(date)}-${String(date.getDate()).padStart(2, '0')}`
}
