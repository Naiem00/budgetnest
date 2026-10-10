import { test, expect } from '@playwright/test'

test('login page loads', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByText('BudgetNest').first()).toBeVisible()
})

test('register page loads directly', async ({ page }) => {
  const response = await page.goto('/register')

  expect(response?.status()).toBeLessThan(400)
  await expect(page.locator('body')).not.toContainText('Not Found')
})

test('forgot password page survives refresh', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.reload()

  await expect(page.locator('body')).not.toContainText('Not Found')
})

test('reset password route loads directly', async ({ page }) => {
  const response = await page.goto('/reset-password?token=playwright-test')

  expect(response?.status()).toBeLessThan(400)
  await expect(page.locator('body')).not.toContainText('Not Found')
})

test('protected dashboard redirects unauthenticated user', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login/)
})

test('mobile page does not overflow horizontally', async ({ page }) => {
  await page.goto('/login')

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )

  expect(overflow).toBe(false)
})

// The following is a frontend-only smoke test with *mock API responses*.
// It DOES NOT verify a real database or user authorization.
test('authenticated mobile navigation exposes all finance pages', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('budgetnest_token', 'test-only-mock-jwt'))
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    let body = {}
    if (path === '/api/auth/me') {
      body = { user: { id: 1, name: 'QA User', email: 'qa@example.test', country_code: 'JP', currency_code: 'JPY' } }
    } else if (path === '/api/transactions') {
      body = { transactions: [] }
    } else if (path === '/api/transactions/summary') {
      body = { income: 0, expenses: 0, savings: 0 }
    } else if (path === '/api/goals') {
      body = { goals: [] }
    } else if (path.startsWith('/api/budgets')) {
      body = { budgets: [], categories: ['Food','Housing','Transport','Shopping','Bills','Entertainment','Health','Other'], summary: { totalBudget: 0, totalSpent: 0, remaining: 0, percent: 0 } }
    } else return route.continue()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/')
  for (const name of ['Dashboard','Transactions','Budgets','Goals','Recurring','Reports','Settings']) {
    await expect(page.getByRole('navigation').getByRole('button', { name: new RegExp(name) })).toBeVisible()
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})

test('deleted receipt scanner route is not accessible', async ({ page }) => {
  await page.goto('/receipt-scan')
  await expect(page).toHaveURL(/\/login$/)
})


test('goals route requires login', async ({ page }) => {
  await page.goto('/goals')
  await expect(page).toHaveURL(/\/login$/)
})

test('savings goals page shows recorded goal with its original currency', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('budgetnest_token', 'test-only-mock-jwt'))
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      user: { id: 1, name: 'QA User', email: 'qa@example.test', country_code: 'JP', currency_code: 'JPY' },
    }),
  }))
  await page.route('**/api/goals', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      goals: [{ id: 10, title: 'Emergency Fund', targetAmount: 100000, savedAmount: 25000,
        remainingAmount: 75000, percent: 25, currencyCode: 'JPY', deadline: null }],
    }),
  }))
  await page.goto('/goals')
  await expect(page.getByRole('heading', { name: 'Savings Goals' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Emergency Fund' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Emergency Fund progress' })).toHaveAttribute('aria-valuenow', '25')
})


test('recurring route requires login', async ({page}) => {
  await page.goto('/recurring')
  await expect(page).toHaveURL(/\/login$/)
})

test('recurring page displays manual confirmation before posting', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('budgetnest_token','test-only-mock-jwt'))
  await page.route('**/api/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:1,name:'Test',email:'test@example.invalid',country_code:'JP',currency_code:'JPY'}})}))
  await page.route('**/api/recurring?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({templates:[{
    id:5,title:'Monthly Rent',type:'expense',amount:50000,currencyCode:'JPY',category:'Housing',
    dayOfMonth:1,startMonth:'2020-01',active:true,posted:false,merchant:'',paymentMethod:'',note:'',
  }]})}))
  await page.goto('/recurring')
  await expect(page.getByRole('heading',{name:'Recurring Transactions'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Monthly Rent'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Review & Record'})).toBeVisible()
  await expect(page.getByText('never posted automatically')).toBeVisible()
})
