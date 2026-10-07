import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { buildOcrDocument } from './ocrDocument.js'
import { extractReceipt, FIELD_NAMES } from './extractReceipt.js'

// A fixed "today" so tests can detect any attempt to fall back to the current date.
const NOW = '2026-10-07T12:00:00Z'
const NOW_DATE = '2026-10-07'

// Fields checked against each fixture's `expected` block.
// (category is secondary and is not tested yet.)
const CHECKED_FIELDS = ['merchant', 'total', 'date', 'currency']

const fixturesDir = new URL('./fixtures/', import.meta.url)

const fixtures = readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => ({
    file: name,
    ...JSON.parse(readFileSync(new URL(name, fixturesDir), 'utf8')),
  }))

function run(fixture) {
  const doc = buildOcrDocument(fixture.lines)
  return extractReceipt(doc, { now: NOW, locale: fixture.locale })
}

test('there are fixtures to test against', () => {
  assert.ok(fixtures.length >= 6, 'expected at least 6 fixtures')
})

for (const fixture of fixtures) {
  const name = `${fixture.id}`

  // 1) Output shape: every field present, value + confidence between 0 and 1.
  test(`${name}: result has the correct shape`, () => {
    const result = run(fixture)

    for (const field of FIELD_NAMES) {
      assert.ok(result[field], `missing field: ${field}`)
      assert.ok('value' in result[field], `${field} has no value`)
      const c = result[field].confidence
      assert.ok(typeof c === 'number' && c >= 0 && c <= 1, `${field} confidence must be 0..1`)
    }
  })

  // 2) The most important rule: null is fine, a WRONG value is never fine.
  //    If the fixture expects null, any non-null value is wrong too.
  test(`${name}: never confidently wrong`, () => {
    const result = run(fixture)

    for (const field of CHECKED_FIELDS) {
      const actual = result[field].value
      if (actual === null) continue
      assert.deepStrictEqual(actual, fixture.expected[field], `wrong ${field}`)
    }
  })

  // 3) Never use today's date unless the receipt really says so.
  test(`${name}: never falls back to today's date`, () => {
    const result = run(fixture)

    if (fixture.expected.date !== NOW_DATE) {
      assert.notEqual(result.date.value, NOW_DATE)
    }
  })

  // 4) Step 2: expected fixture values are now active requirements.
  test(`${name}: extracts the expected values`, () => {
    const result = run(fixture)

    for (const field of CHECKED_FIELDS) {
      assert.deepStrictEqual(result[field].value, fixture.expected[field], field)
    }
  })
}


test('regression: cash/change alone never creates a total', () => {
  const doc = buildOcrDocument([
    'TEST SHOP',
    'Paid 1000',
    'Change 100',
  ])
  const result = extractReceipt(doc)
  assert.deepStrictEqual(result.total, { value: null, confidence: 0 })
})

test('regression: Japanese merchant text is treated as letters, not punctuation', () => {
  const doc = buildOcrDocument([
    'ダイソー',
    '2026年10月04日 11:30',
    '商品 ¥100',
    '合計 ¥100',
  ])
  const result = extractReceipt(doc, { locale: 'ja-JP' })
  assert.equal(result.merchant.value, 'ダイソー')
})

test('regression: Bengali merchant text is treated as letters, not punctuation', () => {
  const doc = buildOcrDocument([
    'ঢাকা ফ্রেশ বেকারি',
    'তারিখ: ২৫-০৯-২০২৬',
    'কেক ৳৫০০',
    'মোট ৳৫০০',
  ])
  const result = extractReceipt(doc, { locale: 'bn-BD' })
  assert.equal(result.merchant.value, 'ঢাকা ফ্রেশ বেকারি')
})
