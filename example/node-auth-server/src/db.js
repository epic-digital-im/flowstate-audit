// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

const path = require('path')
const fs = require('fs')

// Lazy-load better-sqlite3 so the file is auditable even without `npm install`.
let Database
try {
  Database = require('better-sqlite3')
} catch {
  Database = null
}

const config = require('./config')

let db

function init() {
  if (!Database) {
    throw new Error('better-sqlite3 not installed — run `npm install` first')
  }
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })
  db = new Database(config.dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)

  return db
}

function get() {
  if (!db) init()
  return db
}

// BUG: raw query helper that interpolates strings instead of binding params.
// Used by /users/search — direct SQL injection.
function rawQuery(sql) {
  return get().prepare(sql).all()
}

module.exports = { init, get, rawQuery }
