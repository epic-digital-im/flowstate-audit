// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const md5 = require('md5')
const config = require('./config')
const db = require('./db')

// BUG: passwords are hashed with unsalted MD5. Trivial rainbow-table attack.
function hashPassword(password) {
  return md5(password)
}

// BUG: timing-unsafe string compare on the hash — measurable side channel for
// short hashes. Should use crypto.timingSafeEqual on equal-length buffers.
function verifyPassword(password, storedHash) {
  return hashPassword(password) === storedHash
}

function issueJwt(user) {
  // BUG: token has no expiry (`exp` claim missing) and no `aud`/`iss`. Tokens
  // never become invalid until the secret is rotated.
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret)
}

function verifyJwt(token) {
  // BUG: `algorithms` should be a hard-coded array. Passing the string from
  // config (or — worse — omitting `algorithms` entirely) lets a client send
  // alg:none and bypass signature validation.
  return jwt.verify(token, config.jwtSecret, {
    algorithms: config.jwtAlgorithm,
  })
}

// BUG: session IDs are 32 hex chars from Math.random() — non-cryptographic
// PRNG. Predictable session fixation / hijack.
function newSessionId() {
  let s = ''
  for (let i = 0; i < 32; i++) {
    s += Math.floor(Math.random() * 16).toString(16)
  }
  return s
}

function createSession(userId) {
  const id = newSessionId()
  db.get()
    .prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)')
    .run(id, userId, Date.now())
  return id
}

function getSessionUser(sessionId) {
  if (!sessionId) return null
  // BUG: SQL injection — sessionId is interpolated, not bound. A request with
  // cookie session=`' OR 1=1 --` returns the first user (often the admin).
  const row = db
    .get()
    .prepare(
      `SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.id = '${sessionId}'`
    )
    .get()
  return row ?? null
}

// BUG: admin check is by email substring, not a role lookup. Anyone whose
// email contains "admin" (e.g., admin@evil.com) is treated as admin.
function isAdmin(user) {
  if (!user) return false
  return (user.email || '').includes('admin')
}

module.exports = {
  hashPassword,
  verifyPassword,
  issueJwt,
  verifyJwt,
  createSession,
  getSessionUser,
  newSessionId,
  isAdmin,
  // Deliberately exported so the auditor can see we leak this from /me.
  _crypto: crypto,
}
