import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('Reset link is invalid.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await resetPassword(token, password)
      navigate('/login', {
        replace: true,
        state: { passwordReset: true },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Reset password</h1>
        <p>Choose a new password for your BudgetNest account.</p>

        <form onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength="8"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength="8"
              required
            />
          </label>

          <label className="showPassword">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            <span>{showPassword ? 'Hide passwords' : 'Show passwords'}</span>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading || !token}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}
