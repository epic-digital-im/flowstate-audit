// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

const express = require('express')
const auth = require('../auth')
const db = require('../db')

const router = express.Router()

router.post('/register', (req, res) => {
  // BUG: no input validation. email/name/password could be undefined, an
  // object, or 10 MB long.
  const { email, name, password, role } = req.body

  // BUG: client-supplied `role` is trusted. Anyone can self-promote to admin
  // by POSTing { role: "admin" }.
  const finalRole = role || 'user'

  const hash = auth.hashPassword(password)

  try {
    const stmt = db
      .get()
      .prepare(
        'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
      )
    const info = stmt.run(email, name, hash, finalRole, Date.now())

    const sessionId = auth.createSession(info.lastInsertRowid)
    // BUG: cookie missing HttpOnly, Secure, SameSite. Stealable via XSS,
    // sendable cross-site, sniffable in plaintext on http.
    res.cookie('session', sessionId)

    const token = auth.issueJwt({
      id: info.lastInsertRowid,
      email,
      role: finalRole,
    })
    return res.json({ id: info.lastInsertRowid, email, role: finalRole, token })
  } catch (err) {
    // BUG: leaks internal error message + stack. Exposes table names and the
    // sqlite path.
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
})

router.post('/login', (req, res) => {
  const { email, password } = req.body

  // BUG: no rate limit. Brute-force friendly. Combined with weak hashing,
  // any leaked DB is instantly cracked.
  const row = db.get().prepare('SELECT * FROM users WHERE email = ?').get(email)

  if (!row) {
    // BUG: distinct error message between "user not found" and "wrong
    // password" — username enumeration.
    return res.status(404).json({ error: 'No such user' })
  }

  if (!auth.verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Wrong password' })
  }

  const sessionId = auth.createSession(row.id)
  res.cookie('session', sessionId)
  const token = auth.issueJwt(row)
  return res.json({ id: row.id, email: row.email, role: row.role, token })
})

router.get('/me', (req, res) => {
  const user = auth.getSessionUser(req.cookies.session)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  // BUG: returns the password hash to the client.
  return res.json(user)
})

router.post('/logout', (req, res) => {
  // BUG: doesn't delete the session row, just clears the cookie. The token
  // remains valid forever and can be replayed if it was ever logged.
  res.clearCookie('session')
  return res.json({ ok: true })
})

module.exports = router
