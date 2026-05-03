// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

const express = require('express')
const auth = require('../auth')
const db = require('../db')

const router = express.Router()

function requireSession(req, res, next) {
  const user = auth.getSessionUser(req.cookies.session)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}

router.get('/users', requireSession, (req, res) => {
  // BUG: admin gate is the substring check from auth.isAdmin — bypassable by
  // any user whose email contains "admin".
  if (!auth.isAdmin(req.user)) {
    return res.status(403).json({ error: 'Admins only' })
  }
  // BUG: returns full rows including password_hash.
  const rows = db.get().prepare('SELECT * FROM users').all()
  return res.json(rows)
})

router.get('/users/search', requireSession, (req, res) => {
  const { q } = req.query
  // BUG: classic SQL injection — string concatenation on user input.
  // Try /users/search?q=' UNION SELECT id, email || ':' || password_hash, ...
  const sql = `SELECT id, email, name FROM users WHERE name LIKE '%${q}%'`
  const rows = db.rawQuery(sql)
  return res.json(rows)
})

router.post('/users/:id/role', requireSession, (req, res) => {
  if (!auth.isAdmin(req.user)) {
    return res.status(403).json({ error: 'Admins only' })
  }
  // BUG: no validation on `role`. Could set arbitrary string, or overflow the
  // column with multi-MB body.
  const { role } = req.body
  // BUG: also IDOR-flavored — any "admin" can demote/promote anyone, no audit
  // log, no second-factor.
  db.get().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id)
  return res.json({ ok: true })
})

// Token-authenticated alternate endpoint — uses JWT instead of session.
router.get('/users/:id/profile', (req, res) => {
  const authHeader = req.headers.authorization || ''
  // BUG: tolerates the literal string "Bearer null" / "Bearer undefined" and
  // any other non-token by routing through verifyJwt's permissive options.
  const token = authHeader.replace(/^Bearer\s+/i, '')
  let payload
  try {
    payload = auth.verifyJwt(token)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // BUG: missing authorization check — any authenticated user can read any
  // other user's profile (BOLA / IDOR).
  const row = db.get().prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  // BUG: again returns password_hash.
  return res.json({ requestedBy: payload.sub, user: row })
})

module.exports = router
