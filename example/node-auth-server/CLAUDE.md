# example/node-auth-server

**Audit target.** Do not "fix" the bugs in this directory — they are the
intentional findings the LLM-powered auditor (`fsaudit`) is meant to surface.
The ESLint config in the repo root excludes `example/**` from quality rules
so the bugs survive lint-staged on commit.

## Seeded vulnerabilities (non-exhaustive)

| Category                | Where                                                          |
| ----------------------- | -------------------------------------------------------------- |
| Hard-coded secrets      | `src/config.js` — JWT key, admin password, third-party API key |
| Weak password hashing   | `src/auth.js` — unsalted MD5                                   |
| Insecure JWT            | `src/auth.js` — string algorithm, no exp/aud/iss               |
| Predictable session ID  | `src/auth.js` — `Math.random` based                            |
| SQL injection (session) | `src/auth.js#getSessionUser` — string interpolation            |
| SQL injection (search)  | `src/routes/user-routes.js#/users/search`                      |
| Privilege escalation    | `src/routes/auth-routes.js#/register` — trusts client `role`   |
| Broken admin gate       | `src/auth.js#isAdmin` — substring email check                  |
| IDOR / BOLA             | `src/routes/user-routes.js#/users/:id/profile`                 |
| Sensitive disclosure    | `/me`, `/users`, `/users/:id/profile` return `password_hash`   |
| Stack-trace leakage     | `/register` and global error handler return `err.stack`        |
| Username enumeration    | `/login` returns distinct 404 vs 401                           |
| Missing rate limit      | `/login`, `/register`                                          |
| Insecure cookies        | Missing HttpOnly / Secure / SameSite                           |
| Permissive CORS         | `src/server.js` — `*` + credentials                            |
| Logging secrets         | request logger captures cookies in stdout                      |
| Command injection       | `src/routes/util-routes.js#/ping`                              |
| Path traversal          | `src/routes/util-routes.js#/avatar`                            |
| SSRF                    | `src/routes/util-routes.js#/proxy`                             |
| Open redirect           | `src/routes/util-routes.js#/redirect`                          |
| Reflected XSS           | `src/routes/util-routes.js#/hello`                             |
| Bootstrap admin         | `src/server.js#bootstrap` — same admin pwd everywhere          |
| No security headers     | `src/server.js` — no helmet, no CSP / HSTS / X-Frame-Options   |

If a real maintainer ever wants to harden this app, copy it out of `example/`
first — sanitizing the original would defeat its purpose.
