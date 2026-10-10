export function parseMonth(value) {
  if (typeof value !== 'string' || !/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(value)) return null
  return `${value}-01`
}
