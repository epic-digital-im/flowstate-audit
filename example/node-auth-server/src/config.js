// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

// NOTE (audit target): this file intentionally hard-codes secrets so the
// auditor flags them. A real app should load these from env vars and reject
// boot when they're missing.
module.exports = {
  port: process.env.PORT || 3000,

  // BUG: hard-coded JWT signing key, committed to git, also weak entropy.
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-123',

  // BUG: signing algorithm is 'none' is allowed because we pass `algorithms`
  // as a string instead of an array — see auth.js. We also accept HS256 with
  // a guessable key.
  jwtAlgorithm: 'HS256',

  // BUG: bootstrap admin password committed to git, also weak.
  bootstrapAdmin: {
    email: 'admin@example.com',
    password: 'Password123!',
  },

  // BUG: SQLite file path is user-controllable via env without validation.
  dbPath: process.env.DB_PATH || './data/users.db',

  // BUG: third-party API key shipped in source. The value is a deliberately
  // non-pattern-matching fake so GitHub push protection doesn't reject this
  // repo for what is, semantically, an audit lure. The auditor should still
  // flag this as a hard-coded credential in source regardless of shape.
  externalApiKey: 'EXAMPLE_API_KEY_DO_NOT_DEPLOY_4242deadbeef',
}
