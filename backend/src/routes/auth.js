import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'
import { sendPasswordResetEmail } from '../services/email.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, countryCode, currencyCode } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users
        (name, email, password_hash, country_code, currency_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, country_code, currency_code, created_at`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        countryCode || null,
        currencyCode || 'JPY',
      ]
    )

    res.status(201).json({
      message: 'Account created successfully',
      user: result.rows[0],
    })
  } catch (error) {
    console.error('Register error:', error)

    res.status(500).json({
      message: 'Unable to create account',
    })
  }
})


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const result = await pool.query(
      `SELECT id, name, email, password_hash, country_code, currency_code
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const user = result.rows[0]

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        country_code: user.country_code,
        currency_code: user.currency_code,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    res.status(500).json({
      message: 'Unable to login',
    })
  }
})


router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, country_code, currency_code, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.json({
      user: result.rows[0],
    })
  } catch (error) {
    console.error('Current user error:', error)

    res.status(500).json({
      message: 'Unable to load user',
    })
  }
})


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )

    // Always return the same response so attackers cannot
    // discover which email addresses have BudgetNest accounts.
    if (result.rows.length === 0) {
      return res.json({
        message: 'If an account exists for that email, a reset link has been sent.',
      })
    }

    const resetToken = randomBytes(32).toString('hex')

    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex')

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await pool.query(
      `UPDATE users
       SET password_reset_token_hash = $1,
           password_reset_expires_at = $2
       WHERE id = $3`,
      [resetTokenHash, expiresAt, result.rows[0].id]
    )
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173'

    const resetUrl =
      `${frontendUrl}/reset-password?token=${resetToken}`

    try {
      await sendPasswordResetEmail({
        email: normalizedEmail,
        resetUrl,
      })

      console.log('Password reset email sent ✅')
    } catch (emailError) {
      console.error('Password reset email failed:', emailError.message)

      await pool.query(
        `UPDATE users
         SET password_reset_token_hash = NULL,
             password_reset_expires_at = NULL
         WHERE id = $1`,
        [result.rows[0].id]
      )
    }

    res.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)

    res.status(500).json({
      message: 'Unable to process password reset request',
    })
  }
})


router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({
        message: 'Reset token and new password are required',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      })
    }

    const resetTokenHash = createHash('sha256')
      .update(token)
      .digest('hex')

    const result = await pool.query(
      `SELECT id
       FROM users
       WHERE password_reset_token_hash = $1
         AND password_reset_expires_at > NOW()`,
      [resetTokenHash]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: 'Reset link is invalid or has expired',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    )

    res.json({
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)

    res.status(500).json({
      message: 'Unable to reset password',
    })
  }
})

export default router
