import { Resend } from 'resend'

export async function sendPasswordResetEmail({ email, resetUrl }) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from: 'BudgetNest <onboarding@resend.dev>',
    to: email,
    subject: 'Reset your BudgetNest password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Reset your BudgetNest password</h2>

        <p>We received a request to reset your password.</p>

        <p>
          <a
            href="${resetUrl}"
            style="display:inline-block;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;"
          >
            Reset password
          </a>
        </p>

        <p>This link expires in 15 minutes.</p>

        <p>If you didn't request this, you can safely ignore this email.</p>

        <p>— BudgetNest</p>
      </div>
    `,
  })

  if (error) {
    throw new Error(error.message || 'Unable to send reset email')
  }

  return data
}
