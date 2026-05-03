# @flowstate/security-audit-cli

Multi-provider LLM-powered repo audit CLI. Bundles a target directory into XML-wrapped file blocks and streams the result to Anthropic, OpenAI, or Gemini with a chosen audit preset.

## Layout

- `src/index.ts` — `commander` entrypoint, registers `audit` subcommand.
- `src/commands/audit.ts` — bundles the repo, resolves prompts/presets/keys, streams the response, writes artifacts under `audits/<timestamp>__<slug>/`.
- `src/lib/repo-bundler.ts` — recursive walker with binary-content rejection, default exclude list (node_modules, .env, .git, build outputs), include/exclude/extension filters, per-package size accounting, and an empirical char/token estimator (~2.5 chars per token).
- `src/lib/audit-presets.ts` — `security`, `gap`, `architecture`, `quality` system + user prompts.
- `src/lib/llm-stream.ts` — provider-agnostic SSE streaming over `fetch` for Anthropic Messages, OpenAI Chat Completions, and Gemini `:streamGenerateContent`.

## Build

```bash
pnpm --filter @flowstate/security-audit-cli build
```

Produces `dist/index.js` with a `#!/usr/bin/env node` banner; the `bin` is `fsaudit`.

## Run against the example

```bash
ANTHROPIC_API_KEY=... node packages/cli/dist/index.js \
  audit --target example/node-auth-server --preset security
```

Or `pnpm audit:example` from the repo root.
