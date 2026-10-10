import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'
import { sendPasswordResetEmail } from '../services/email.js'
import { getFrontendUrl } from '../services/frontendUrl.js'

const router = Router()
const FAILED_WINDOW_MS = 15 * 60 * 1000
const attempts = new Map()
// Process-local safeguard; distributed production needs shared rate limiting.
function rateLimit(req,res,next) {
  const key = `${req.ip}:${req.path}`
  const now=Date.now()
  const list=(attempts.get(key)||[]).filter(t=>now-t<FAILED_WINDOW_MS)
  if(list.length>=10) return res.status(429).json({message:'Too many requests. Try again later.'})
  list.push(now);attempts.set(key,list)
  if(attempts.size>5000) for(const [k,v] of attempts) if(v[v.length-1]<now-FAILED_WINDOW_MS)attempts.delete(k)
  next()
}
router.use(['/register','/login','/forgot-password','/reset-password','/change-password'],rateLimit)


router.post('/register', async (req, res) => {
  try {
    const { name, email, password, countryCode, currencyCode } = req.body || {}

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || !['JPY','BDT'].includes(currencyCode || 'JPY') || (countryCode && !/^[A-Z]{2}$/.test(countryCode))) {
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
    const { email, password } = req.body || {}

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const result = await pool.query(
      `SELECT id, name, email, password_hash, country_code, currency_code, auth_token_version
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
      { userId: user.id, tokenVersion: user.auth_token_version },
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
    const { email } = req.body || {}

    if (typeof email !== 'string' || !email.trim()) {
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
    const frontendUrl = getFrontendUrl(req)
    if (process.env.NODE_ENV === 'production' && (!process.env.FRONTEND_URL || /localhost|127\.0\.0\.1/.test(frontendUrl))) {
      throw new Error('Set FRONTEND_URL to the HTTPS production frontend before emailing reset links')
    }

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
    const { token, password } = req.body || {}

    if (typeof token !== 'string' || typeof password !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !password) {
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

    const updated = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL,
           auth_token_version = auth_token_version + 1
       WHERE id = $2 AND password_reset_token_hash = $3 AND password_reset_expires_at > NOW()
       RETURNING id`,
      [passwordHash, result.rows[0].id, resetTokenHash]
    )
    if (!updated.rows.length) return res.status(400).json({message:'Reset link is invalid or has expired'})

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


router.patch('/profile', requireAuth, async (req,res)=>{
  const { name,countryCode,currencyCode }=req.body || {}
  if(typeof name!=='string' || !name.trim() || name.trim().length>100 || !['JPY','BDT'].includes(currencyCode) || (countryCode && !/^[A-Z]{2}$/.test(countryCode))) {
    return res.status(400).json({message:'Provide a name, country code, and JPY or BDT currency'})
  }
  try {
    const {rows}=await pool.query(`UPDATE users SET name=$1,country_code=$2,currency_code=$3 WHERE id=$4 RETURNING id,name,email,country_code,currency_code,created_at`,[name.trim(),countryCode || null,currencyCode,req.user.id])
    if(!rows.length)return res.status(404).json({message:'User not found'})
    res.json({message:'Profile updated; historical amounts keep their recorded currency',user:rows[0]})
  }catch(err){console.error('Profile error',err);res.status(500).json({message:'Unable to update profile'})}
})
router.post('/change-password',requireAuth,async(req,res)=>{
  const { currentPassword,newPassword }=req.body||{}
  if(typeof currentPassword!=='string' || typeof newPassword!=='string' || newPassword.length<8 || newPassword.length>128)return res.status(400).json({message:'Provide current password and a new password (8–128 characters)'})
  try{
    const {rows}=await pool.query('SELECT password_hash FROM users WHERE id=$1',[req.user.id])
    if(!rows.length || !await bcrypt.compare(currentPassword,rows[0].password_hash))return res.status(401).json({message:'Current password is incorrect'})
    const hash=await bcrypt.hash(newPassword,12)
    await pool.query('UPDATE users SET password_hash=$1,password_reset_token_hash=NULL,password_reset_expires_at=NULL,auth_token_version=auth_token_version+1 WHERE id=$2',[hash,req.user.id])
    res.json({message:'Password updated. Please sign in again.'})
  }catch(err){console.error('Change password error',err);res.status(500).json({message:'Unable to update password'})}
})

export default router
