import nodemailer from 'nodemailer'

export async function sendPasswordResetEmail({ email, resetUrl }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  })

  const info = await transporter.sendMail({
    from: `"BudgetNest" <${process.env.EMAIL_USER}>`,
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

  return info
}
