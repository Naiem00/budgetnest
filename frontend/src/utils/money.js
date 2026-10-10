export function money(value,currency='JPY') {
  const unit = ['JPY','BDT'].includes(currency) ? currency : 'JPY'
  return new Intl.NumberFormat(unit==='BDT' ? 'en-BD' : 'ja-JP',{style:'currency',currency:unit,maximumFractionDigits:unit==='JPY'?0:2}).format(Number(value)||0)
}
export function isoDay(value) { return typeof value === 'string' ? value.slice(0,10) : '' }
