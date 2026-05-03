// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

const express = require('express')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

const router = express.Router()

// BUG: command injection via `host` query parameter.
// Try /ping?host=localhost;cat%20/etc/passwd
router.get('/ping', (req, res) => {
  const { host } = req.query
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: err.message, stderr })
    return res.type('text/plain').send(stdout)
  })
})

// BUG: path traversal via `name` query parameter.
// Try /avatar?name=../../etc/passwd
router.get('/avatar', (req, res) => {
  const { name } = req.query
  const file = path.join(__dirname, '..', '..', 'avatars', name)
  // BUG: no canonicalization check; readFileSync follows ../ outside the
  // avatars/ directory.
  try {
    const buf = fs.readFileSync(file)
    return res.type('image/png').send(buf)
  } catch (err) {
    return res.status(404).json({ error: err.message, path: file })
  }
})

// BUG: SSRF — fetches an arbitrary URL on behalf of the client.
// Internal targets like http://169.254.169.254/latest/meta-data/ become
// reachable from the server's network position.
router.get('/proxy', async (req, res) => {
  const { url } = req.query
  try {
    const upstream = await fetch(url)
    const text = await upstream.text()
    return res.type(upstream.headers.get('content-type') || 'text/plain').send(text)
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
})

// BUG: open redirect — `to` is reflected into Location with no allowlist.
// Useful for phishing payloads pointing back at this domain.
router.get('/redirect', (req, res) => {
  const { to } = req.query
  return res.redirect(to)
})

// BUG: reflected XSS — `name` is interpolated into the HTML response with no
// escaping. Try /hello?name=<script>alert(1)</script>
router.get('/hello', (req, res) => {
  const { name } = req.query
  res.type('text/html').send(`<h1>Hello, ${name}!</h1>`)
})

module.exports = router
