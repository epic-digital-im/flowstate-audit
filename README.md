# flowstate-security-audit

Multi-provider LLM-powered repo audit CLI plus an intentionally-vulnerable
example target. Extracted from the SAGA standard CLI so that any Epic project
(or external user) can run the same security / gap / architecture reviews
without pulling in the SAGA SDK.

## Layout

```
flowstate-security-audit/
├── packages/cli/                 # @flowstate/security-audit-cli — bin: fsaudit
│   ├── src/
│   │   ├── commands/audit.ts     # `fsaudit audit` subcommand
│   │   ├── lib/repo-bundler.ts   # walks a directory into XML <file> blocks
│   │   ├── lib/audit-presets.ts  # security / gap / architecture / quality
│   │   └── lib/llm-stream.ts     # Anthropic / OpenAI / Gemini SSE streaming
│   └── ...
└── example/node-auth-server/     # intentionally-vulnerable Express app
    └── ...                       # used as a target so audits return findings
```

## Standards (inherited from saga-standard)

- **Husky pre-commit hook** — gitleaks (if installed) → lint-staged → typecheck on affected packages
- **gitleaks** — `.gitleaks.toml` extends defaults + Bearer-JWT detection rule
- **lint-staged** — license headers + ESLint + Prettier on every staged file
- **SPDX license headers** — `node scripts/add-license-headers.js [--check] [--files ...]`
- **ESLint** — `eslint:recommended` + `@typescript-eslint/recommended` + Prettier; `example/` is excluded from quality rules so its bugs survive
- **Prettier** — single quotes, no semicolons, 100-col width
- **TypeScript** — strict mode in `tsconfig.base.json`, ES2022 target, ESM
- **Apache-2.0** — root LICENSE; SPDX header on every source file

## Setup

```bash
cd flowstate-security-audit
pnpm install
pnpm prepare    # installs husky hooks
pnpm -r build
```

## Run an audit

Set one of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` (in
your shell, in `.env`, or in `.dev.vars` in the cwd you run from).

```bash
# audit the example target with the security preset
pnpm audit:example

# or directly
node packages/cli/dist/index.js audit \
  --target example/node-auth-server \
  --preset security

# other presets
... --preset gap            # spec ↔ implementation gap analysis
... --preset architecture   # high-level architecture and coupling review
... --preset quality        # code quality & maintainability review

# pick a non-default provider/model
... --provider openai --model gpt-4o
... --provider gemini --model gemini-2.5-pro

# preview without spending tokens
... --dry-run
```

Run artifacts (prompt, response, manifest) are saved under `audits/<timestamp>__<slug>/`.

## Why the example app is full of bugs

`example/node-auth-server` is the audit target: a tiny Express app with a
deliberate cluster of OWASP-grade flaws (SQLi, command injection, path
traversal, SSRF, XSS, hard-coded secrets, MD5 password hashing, JWT
misconfiguration, missing rate limit, IDOR, info disclosure, permissive CORS).
Running `fsaudit audit --target example/node-auth-server --preset security`
should return a severity-ranked report with concrete file:line references.

## License

Apache-2.0. See `LICENSE`.
