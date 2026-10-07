export async function sendPasswordResetEmail({ email, resetUrl }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'BudgetNest',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email }],
      subject: 'Reset your BudgetNest password',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          <h2>Reset your BudgetNest password</h2>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
              Reset password
            </a>
          </p>
          <p>This link expires in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>— BudgetNest</p>
        </div>
      `,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`Brevo ${response.status}: ${data.message || 'Email send failed'}`)
  }

  return data
}
