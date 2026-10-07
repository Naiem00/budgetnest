import * as brevo from '@getbrevo/brevo'

export async function sendPasswordResetEmail({ email, resetUrl }) {
  const apiInstance = new brevo.TransactionalEmailsApi()

  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  )

  const sendSmtpEmail = new brevo.SendSmtpEmail()

  sendSmtpEmail.subject = 'Reset your BudgetNest password'

  sendSmtpEmail.htmlContent = `
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
  `

  sendSmtpEmail.sender = {
    name: 'BudgetNest',
    email: process.env.BREVO_SENDER_EMAIL,
  }

  sendSmtpEmail.to = [{ email }]

  return apiInstance.sendTransacEmail(sendSmtpEmail)
}
