// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const config = require('./config')
const db = require('./db')
const auth = require('./auth')
const authRoutes = require('./routes/auth-routes')
const userRoutes = require('./routes/user-routes')
const utilRoutes = require('./routes/util-routes')

const app = express()

// BUG: no helmet / no security headers (X-Frame-Options, CSP, HSTS, etc.).
// BUG: body size limit is the express default (100kb on json) but /register
// has no per-route limit — a single large request can DoS the worker.
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

// BUG: permissive CORS — any origin can call this API with credentials.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', '*')
  res.header('Access-Control-Allow-Methods', '*')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// BUG: request logger writes the full URL (including ?token=... and other
// secrets) to stdout where any log shipper will index it.
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl} cookie=${req.headers.cookie || '-'}`)
  next()
})

app.use('/', authRoutes)
app.use('/', userRoutes)
app.use('/', utilRoutes)

// BUG: catch-all error handler returns the stack to the client.
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message, stack: err.stack })
})

function bootstrap() {
  db.init()
  // BUG: bootstraps the admin if missing, using the hard-coded password from
  // config and the broken md5 hasher. Result: every fresh install ships with
  // the same predictable admin credential.
  const existing = db
    .get()
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(config.bootstrapAdmin.email)
  if (!existing) {
    db.get()
      .prepare(
        'INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        config.bootstrapAdmin.email,
        'Admin',
        auth.hashPassword(config.bootstrapAdmin.password),
        'admin',
        Date.now()
      )
    console.log(`[bootstrap] admin seeded (${config.bootstrapAdmin.email})`)
  }
}

if (require.main === module) {
  bootstrap()
  app.listen(config.port, () => {
    console.log(`auth server listening on :${config.port}`)
  })
}

module.exports = { app, bootstrap }
