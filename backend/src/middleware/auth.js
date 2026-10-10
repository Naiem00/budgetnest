import jwt from 'jsonwebtoken'
import {pool} from '../config/database.js'
import {tokenVersionMatches} from '../services/tokenVersion.js'

export async function requireAuth(req,res,next) {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '')
  if (!match) return res.status(401).json({message:'Authentication required'})
  try {
    const payload=jwt.verify(match[1],process.env.JWT_SECRET,{algorithms:['HS256']})
    if (!/^[1-9]\d*$/.test(String(payload.userId || ''))) return res.status(401).json({message:'Invalid or expired token'})
    const {rows}=await pool.query('SELECT auth_token_version FROM users WHERE id=$1',[payload.userId])
    if(!rows.length || !tokenVersionMatches(payload.tokenVersion,rows[0].auth_token_version)) {
      return res.status(401).json({message:'Invalid or expired token'})
    }
    req.user={id:payload.userId}
    next()
  }catch(error){
    if(error.name==='TokenExpiredError'||error.name==='JsonWebTokenError'||error.name==='NotBeforeError') return res.status(401).json({message:'Invalid or expired token'})
    console.error('Authentication service error:',error)
    return res.status(503).json({message:'Authentication temporarily unavailable'})
  }
}
