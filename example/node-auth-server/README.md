# node-auth-server (intentionally vulnerable)

> **DO NOT DEPLOY THIS.** It is an audit target. Every "security best practice"
> you can think of has been violated on purpose so the `fsaudit` LLM-powered
> auditor has something to find.

A minimal Express server with user registration, login (cookie session + JWT
issuance), a session-protected `/me` endpoint, an admin-only user list, a
search endpoint, and a "ping" health endpoint that shells out.

## Quick start

```bash
cd example/node-auth-server
npm install
node src/server.js
```

Server listens on `http://localhost:3000`.

## Endpoints

| Method | Path              | Auth       | Description                           |
| ------ | ----------------- | ---------- | ------------------------------------- |
| POST   | `/register`       | none       | Create a user                         |
| POST   | `/login`          | none       | Set session cookie + return JWT       |
| GET    | `/me`             | session    | Current user                          |
| GET    | `/users`          | admin role | List all users                        |
| GET    | `/users/search`   | session    | Search users by name (LIKE)           |
| POST   | `/users/:id/role` | admin role | Change a user's role                  |
| GET    | `/ping`           | none       | Run a ping against the supplied host  |
| GET    | `/avatar`         | none       | Read an avatar file from `./avatars/` |

## Why it exists

Run `fsaudit audit --target example/node-auth-server --preset security` from
the repo root and the auditor should produce a report enumerating the
vulnerabilities seeded into this app. If you are reading the source and feel
the urge to "fix" something — don't; the bugs are the product.
