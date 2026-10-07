// Pure, merchant-agnostic receipt extraction engine.
// Safe rule: if evidence is not strong enough, return null instead of guessing.

export const FIELD_NAMES = ['merchant', 'total', 'date', 'currency', 'category']

const BENGALI_DIGITS = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
}

const FULLWIDTH_DIGITS = {
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
}

function unknown() {
  return { value: null, confidence: 0 }
}

function normalizeText(value) {
  let text = String(value ?? '').normalize('NFKC')
  text = text.replace(/[০-৯]/g, (d) => BENGALI_DIGITS[d] ?? d)
  text = text.replace(/[０-９]/g, (d) => FULLWIDTH_DIGITS[d] ?? d)
  return text
}

function normalizedConfidence(line) {
  const raw = Number(line?.confidence ?? 90)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw))
}

function roundConfidence(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function hasLetters(text) {
  return /\p{L}/u.test(text)
}

function lettersAndNumbers(text) {
  return (text.match(/[\p{L}\p{N}]/gu) || []).length
}

function isDateOrTimeLine(text) {
  const t = normalizeText(text)
  return (
    /(?:19|20)\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/u.test(t) ||
    /\b(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/u.test(t) ||
    /\b\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}\b/u.test(t) ||
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/u.test(t) ||
    /(?:date|time|তারিখ)\s*:/iu.test(t)
  )
}

function isPhoneOrIdentifierLine(text) {
  const t = normalizeText(text)
  return (
    /\b(?:tel|phone|mobile|bin|trx\s*id|transaction\s*id|invoice|receipt|slip|ref(?:erence)?|reg(?:istration)?|no\.)\b/iu.test(t) ||
    /(?:登録番号|伝票番号|レジ\s*\d*\s*no\.?)/iu.test(t) ||
    /\bT\d{10,}\b/u.test(t) ||
    /\b\d{10,}\b/u.test(t)
  )
}

function isAddressLikeLine(text) {
  const t = normalizeText(text)
  // Conservative: only reject clear address-like lines; do not require Latin script.
  return (
    /\b(?:road|rd\.?|street|st\.?|house|avenue|ave\.?)\b/iu.test(t) ||
    /(?:東京都|大阪府|京都府|北海道|県|市|区|町|丁目)/u.test(t) && /\d/u.test(t)
  )
}

function isGenericReceiptLine(text) {
  const t = normalizeText(text).trim()
  return /^(?:receipt|領収書|レシート|invoice|cash memo|রসিদ)$/iu.test(t)
}

function firstStructuralLineIndex(lines) {
  const index = lines.findIndex((line) => {
    const t = normalizeText(line?.text).trim()
    return isDateOrTimeLine(t) || /(?:¥|￥|৳|\bJPY\b|\bBDT\b|\bTk\b)/iu.test(t)
  })
  return index === -1 ? Math.min(lines.length, 8) : Math.min(index, 8)
}

function extractMerchant(lines, imageHeight) {
  if (!Array.isArray(lines) || lines.length === 0) return unknown()

  const stop = Math.max(1, firstStructuralLineIndex(lines))
  const candidates = []

  for (let i = 0; i < stop; i += 1) {
    const line = lines[i]
    const raw = String(line?.text ?? '').trim()
    const text = normalizeText(raw)
    if (!text || text.length < 2) continue

    const conf = normalizedConfidence(line)
    if (conf < 0.55) continue
    if (!hasLetters(text)) continue
    if (isDateOrTimeLine(text) || isPhoneOrIdentifierLine(text) || isAddressLikeLine(text) || isGenericReceiptLine(text)) continue

    const meaningful = lettersAndNumbers(text)
    if (meaningful < 2) continue

    // Unicode-aware noise ratio: Japanese and Bengali letters count as letters.
    const visible = (text.match(/\S/gu) || []).length
    const noise = (text.match(/[^\p{L}\p{M}\p{N}\p{Zs}&'’・.\-]/gu) || []).length
    if (visible > 0 && noise / visible > 0.35) continue

    const y0 = Number(line?.bbox?.y0)
    const relY = Number.isFinite(y0) && imageHeight > 0 ? y0 / imageHeight : i / Math.max(lines.length, 1)
    if (relY > 0.35) continue

    // Header position is useful but OCR confidence remains important.
    const positionBoost = Math.max(0, 0.22 - (i * 0.045))
    const score = conf * 0.78 + positionBoost
    candidates.push({ value: raw, score, index: i })
  }

  if (candidates.length === 0) return unknown()
  candidates.sort((a, b) => b.score - a.score || a.index - b.index)
  const best = candidates[0]

  if (best.score < 0.62) return unknown()
  return { value: best.value, confidence: roundConfidence(best.score) }
}

function parseAmounts(text) {
  const t = normalizeText(text)
  const regex = /(?:¥|￥|৳|\b(?:JPY|BDT|Tk)\b\s*)?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.([0-9]{1,2}))?/giu
  const values = []
  let match
  while ((match = regex.exec(t)) !== null) {
    const integer = match[1].replace(/,/g, '')
    const fraction = match[2] ? `.${match[2].padEnd(2, '0')}` : ''
    const value = Number(`${integer}${fraction}`)
    if (Number.isFinite(value) && value >= 0) {
      values.push({ value, index: match.index, raw: match[0] })
    }
  }
  return values
}

function lastAmount(text) {
  const amounts = parseAmounts(text)
  return amounts.length ? amounts[amounts.length - 1].value : null
}

function nearlyEqual(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.011
}

function hasExplicitTotalLabel(text) {
  const t = normalizeText(text)
  // Word boundaries prevent TOTAL from matching SUBTOTAL.
  return (
    /\bgrand\s+total\b/iu.test(t) ||
    /\btotal\b/iu.test(t) && !/\bsubtotal\b/iu.test(t) ||
    /\bamount\s+due\b/iu.test(t) ||
    /(?:^|\s)(?:合計|総合計|お会計|お買上計|お支払(?:い)?)(?:\s|$|[:：])/u.test(t) ||
    /(?:^|\s)মোট(?:\s|$|[:：])/u.test(t)
  )
}

function isSubtotalOrTaxLine(text) {
  const t = normalizeText(text)
  return /\bsubtotal\b|\btax\b|\bvat\b|小計|消費税|内消費税|外税|税額/iu.test(t)
}

function isTenderedLine(text) {
  const t = normalizeText(text)
  return /\b(?:paid|cash|tendered|amount\s+tendered)\b|お預り|お預かり|নগদ/iu.test(t) && !hasExplicitTotalLabel(t)
}

function isChangeLine(text) {
  const t = normalizeText(text)
  return /\bchange\b|お釣り|おつり|ফেরত/iu.test(t)
}

function isPaymentMethodLine(text) {
  const t = normalizeText(text)
  return /\b(?:credit|debit|visa|mastercard|amex|card)\b|クレジット|カード/iu.test(t)
}

function looksLikeItemLine(text) {
  const t = normalizeText(text).trim()
  if (!t || !hasLetters(t)) return false
  if (isDateOrTimeLine(t) || isPhoneOrIdentifierLine(t) || isAddressLikeLine(t)) return false
  if (hasExplicitTotalLabel(t) || isSubtotalOrTaxLine(t) || isTenderedLine(t) || isChangeLine(t) || isPaymentMethodLine(t)) return false

  const amounts = parseAmounts(t)
  if (amounts.length === 0) return false

  // Require descriptive letters before the final amount. This excludes bare stray numbers.
  const finalAmount = amounts[amounts.length - 1]
  const before = t.slice(0, finalAmount.index)
  return (before.match(/\p{L}/gu) || []).length >= 2
}

function extractTotal(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return unknown()

  const explicitTotals = []
  const itemAmounts = []
  const tenderedValues = []
  const changeValues = []

  for (const line of lines) {
    const text = normalizeText(line?.text).trim()
    if (!text) continue
    const conf = normalizedConfidence(line)
    if (conf < 0.5) continue

    // Never allow identifiers, dates or times to become money candidates.
    if (isPhoneOrIdentifierLine(text) || isDateOrTimeLine(text)) continue

    const amount = lastAmount(text)
    if (amount === null) continue

    if (isChangeLine(text)) {
      changeValues.push({ value: amount, confidence: conf })
      continue
    }
    if (isTenderedLine(text)) {
      tenderedValues.push({ value: amount, confidence: conf })
      continue
    }
    if (hasExplicitTotalLabel(text) && !isSubtotalOrTaxLine(text)) {
      explicitTotals.push({ value: amount, confidence: conf })
      continue
    }
    if (isSubtotalOrTaxLine(text) || isPaymentMethodLine(text)) continue

    if (looksLikeItemLine(text)) {
      itemAmounts.push({ value: amount, confidence: conf })
    }
  }

  if (explicitTotals.length > 0) {
    explicitTotals.sort((a, b) => b.confidence - a.confidence)
    const best = explicitTotals[0]
    return { value: best.value, confidence: roundConfidence(Math.max(0.86, best.confidence * 0.95)) }
  }

  // Unlabelled totals are allowed only when two independent relationships agree:
  // sum(line items) === tendered - change. Cash/change alone never creates a total.
  if (itemAmounts.length >= 2 && tenderedValues.length > 0 && changeValues.length > 0) {
    const itemSum = itemAmounts.reduce((sum, item) => sum + item.value, 0)

    for (const tendered of tenderedValues) {
      for (const change of changeValues) {
        if (tendered.value <= change.value) continue
        const cashDerived = tendered.value - change.value
        if (cashDerived > 0 && nearlyEqual(itemSum, cashDerived)) {
          const weakest = Math.min(
            ...itemAmounts.map((item) => item.confidence),
            tendered.confidence,
            change.confidence,
          )
          return { value: Number(itemSum.toFixed(2)), confidence: roundConfidence(Math.max(0.82, weakest * 0.92)) }
        }
      }
    }
  }

  return unknown()
}

function isValidDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger)) return false
  if (year < 1900 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

function dateResult(year, month, day, confidence) {
  if (!isValidDate(year, month, day)) return unknown()
  return {
    value: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    confidence: roundConfidence(confidence),
  }
}

function extractDate(lines, locale) {
  if (!Array.isArray(lines) || lines.length === 0) return unknown()

  for (const line of lines) {
    if (normalizedConfidence(line) < 0.5) continue
    const text = normalizeText(line?.text)

    let match = text.match(/\b((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/u)
    if (match) return dateResult(Number(match[1]), Number(match[2]), Number(match[3]), 0.94)

    match = text.match(/((?:19|20)\d{2})\s*年\s*(0?[1-9]|1[0-2])\s*月\s*(0?[1-9]|[12]\d|3[01])\s*日/u)
    if (match) return dateResult(Number(match[1]), Number(match[2]), Number(match[3]), 0.94)

    match = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})\b/u)
    if (!match) continue

    const first = Number(match[1])
    const second = Number(match[2])
    const year = Number(match[3])

    if (first > 12 && second <= 12) return dateResult(year, second, first, 0.9)
    if (second > 12 && first <= 12) return dateResult(year, first, second, 0.9)

    // Ambiguous numeric dates stay null unless locale supplies a decisive convention.
    if (first <= 12 && second <= 12) {
      if (locale === 'bn-BD' || locale === 'en-GB') return dateResult(year, second, first, 0.82)
      if (locale === 'en-US') return dateResult(year, first, second, 0.82)
      return unknown()
    }
  }

  return unknown()
}

function extractCurrency(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return unknown()

  let jpyEvidence = 0
  let bdtEvidence = 0
  let usdEvidence = 0

  for (const line of lines) {
    if (normalizedConfidence(line) < 0.5) continue
    const text = normalizeText(line?.text)
    if (/¥|￥|\bJPY\b|円/iu.test(text)) jpyEvidence += 1
    if (/৳|\bBDT\b|\bTk\b/iu.test(text)) bdtEvidence += 1
    if (/\bUSD\b|\$/iu.test(text)) usdEvidence += 1
  }

  const ranked = [
    { value: 'JPY', count: jpyEvidence },
    { value: 'BDT', count: bdtEvidence },
    { value: 'USD', count: usdEvidence },
  ].filter((x) => x.count > 0).sort((a, b) => b.count - a.count)

  if (ranked.length === 0) return unknown()
  if (ranked.length > 1 && ranked[0].count === ranked[1].count) return unknown()

  return { value: ranked[0].value, confidence: roundConfidence(Math.min(0.96, 0.8 + ranked[0].count * 0.03)) }
}

export function extractReceipt(ocrDocument, options = {}) {
  const lines = Array.isArray(ocrDocument?.lines) ? ocrDocument.lines : []
  const imageHeight = Number(ocrDocument?.imageHeight) || 1

  return {
    merchant: extractMerchant(lines, imageHeight),
    total: extractTotal(lines),
    date: extractDate(lines, options.locale ?? null),
    currency: extractCurrency(lines),
    category: unknown(),
  }
}
