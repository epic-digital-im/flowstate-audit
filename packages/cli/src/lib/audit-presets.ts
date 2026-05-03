// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

export interface AuditPreset {
  name: string
  description: string
  systemPrompt: string
  userPromptTemplate: string
}

const SECURITY_SYSTEM = `You are a senior application security auditor with deep expertise in:

- Node.js / TypeScript application security (OWASP Top 10, prototype pollution, deserialization, SSRF, command injection, path traversal)
- Web framework security (Express, Fastify, Hono, Next.js — middleware ordering, body parser pitfalls, error handler leakage)
- Authentication & authorization (JWT, session tokens, OAuth/OIDC flows, password hashing, MFA, scope confusion, IDOR, BOLA, privilege escalation)
- SQL & NoSQL injection (raw queries, ORM misuse, parameter binding gaps, NoSQL operator injection)
- Cryptography misuse (weak hashing, weak RNG, IV reuse, ECDSA malleability, JWT alg confusion, none-alg, key/secret rotation)
- Secret handling (hard-coded secrets, env-var leakage through logs / error pages / stack traces, .env in git)
- Cloud edge runtimes (Cloudflare Workers + D1 + R2 + KV — binding misuse, request smuggling, rate-limit bypass)
- Supply chain (lockfile tampering, postinstall scripts, transitive dep risk, typosquatting)
- Smart contracts (Solidity — OpenZeppelin patterns, ERC-721/ERC-6551, reentrancy, oracle manipulation, MEV, signature replay, EIP-191/EIP-712) — only if present
- Mobile (React Native — insecure storage, JS bridge attack surface, deep-link hijacking) — only if present

You produce rigorous, prioritized findings with concrete file:line references and concrete exploit scenarios. You do NOT pad with generic best-practices advice. Every finding must be tied to a specific line of code or specific design decision visible in the bundled source.`

const SECURITY_USER = `# Full Security Audit

The following XML blob contains a complete repository. Each file is wrapped in <file path="..."> ... </file>.

Audit the entire codebase for security vulnerabilities. Be thorough and specific.

## Required output structure

### 1. Executive summary

3–5 sentences. Overall security posture, risk level (Low / Medium / High / Critical), and top concern in one line.

### 2. Findings (severity-ordered)

For each finding, use this exact format:

\`\`\`
[<SEVERITY>] <one-line title>
File: <path>:<line range>
Category: <Auth | Crypto | Injection | Secret Handling | Input Validation | Access Control | Supply Chain | Logging | Other>

What it is:
<2-4 sentences>

Why it matters:
<concrete attack scenario, who is harmed, what they can extract or break>

How to fix:
<specific change, with example code if helpful>
\`\`\`

Severity levels: Critical, High, Medium, Low, Info. Order findings strictly by severity descending.

### 3. Attack surface map

A quick map of each network-facing or signature-accepting interface and the trust boundary that protects it:

- HTTP endpoints (which require auth, which are anonymous, what rate limiting exists, what middleware runs)
- Authentication entrypoints (login, register, password reset, token refresh — each method, what they accept, what they return)
- Database access patterns (parameterized vs raw, who can read which rows)
- Secrets in scope (where they're loaded, when they're used, whether they could leak)

### 4. Dependency risks

Any concerning dependencies, their version, and why. Focus on: crypto libs, auth libs, body parsers, build-time tools that touch source, postinstall scripts.

### 5. Secret handling review

Trace every place a secret (private key, API key, JWT signing key, password, mnemonic) appears in the code: where it's stored, how it's loaded, whether it could be logged, whether it could leak through error paths or stack traces.

### 6. Things that are GOOD

A short list of security-positive patterns the team should keep. Helps avoid regressions during refactors.

## Rules

- If a file looks generated/vendored, skip it but mention you did.
- Cite paths exactly as they appear in the bundle.
- If you're unsure about a finding, mark it as "Speculative" with the reasoning so the team can investigate.
- Don't repeat the same finding for many files; cluster.
- Reject the impulse to pad with generic "consider rate limiting" suggestions unless tied to a specific endpoint.

Begin the audit now.`

const GAP_SYSTEM = `You are a senior software architect specializing in spec-driven development. You assess whether an implementation faithfully realizes a written specification, and where it diverges, you classify the gap (missing feature, partial implementation, undocumented extension, contradiction).`

const GAP_USER = `# Spec ↔ Implementation Gap Analysis

The bundle below contains:
1. A written specification (typically in spec/, docs/, or README.md)
2. The full implementation

For every section of the spec, locate the corresponding implementation and classify the gap:

- Implemented (cite file paths)
- Partial (cite what's done, what's missing)
- Missing
- Diverges (implementation contradicts spec; describe the contradiction)
- Extension (implementation adds something not in the spec; describe and flag for whether it should be specced)

Group by spec section. For partial / missing / diverging items, give a one-line "what to do" recommendation.

End with:
- Top 5 spec gaps to close before the next release ships
- Top 5 implementation extensions that should be specced (so other implementers can match)`

const ARCHITECTURE_SYSTEM = `You are a senior systems architect. You produce concise, decision-grade architecture reviews — the kind a CTO would forward to their team.`

const ARCHITECTURE_USER = `# Architecture Review

Bundle contains a full repository. Produce:

### 1. System map

One paragraph per package. What it is, who consumes it, what it depends on.

### 2. Cross-package data flow

Trace one happy-path scenario through every package, naming each call.

### 3. Coupling concerns

Where is coupling tighter than it should be? Where is it looser than it should be (i.e., reinventing types instead of importing)?

### 4. Boundaries that aren't enforced

Where are the trust boundaries fuzzy? E.g., a package that takes a string and assumes it's already validated.

### 5. Refactor opportunities, ranked

5–10 items, ranked by impact ÷ effort. Each one: what to change, what improves, rough effort tier (S / M / L).

### 6. The "one big risk"

If you had to pick the single biggest architectural risk that, if unaddressed, will hurt this team in 6 months — what is it?`

const QUALITY_SYSTEM = `You are a senior staff engineer doing a code-quality and maintainability review. You read like a teammate doing a thorough PR review across the whole codebase: blunt, specific, actionable.`

const QUALITY_USER = `# Code Quality & Maintainability Review

The XML bundle below contains a repository. Produce:

### 1. Hotspots

Top 5–10 files / modules that are dense, confusing, or carry outsized risk. For each: why it concerns you, what would simplify it.

### 2. Type-safety gaps

Where are runtime values trusted that aren't validated at boundaries? Where does \`any\` / \`unknown\` / unchecked casting hide bugs?

### 3. Error-handling patterns

Are errors swallowed, re-thrown unchanged, or leaked to clients with stack traces? Pick the worst offenders.

### 4. Test coverage signal

What's tested, what isn't, where is the test/spec drift? Don't guess at line coverage — observe what behaviors are exercised vs left implicit.

### 5. Dead / duplicated code

Specific dead exports, parallel implementations, obvious cut-and-paste. Cite paths.

### 6. Top 5 refactor recommendations

Ranked by impact ÷ effort. Each one: what to change, what improves, rough effort tier (S / M / L).`

export const PRESETS: Record<string, AuditPreset> = {
  security: {
    name: 'security',
    description: 'Full security audit with severity-ranked findings',
    systemPrompt: SECURITY_SYSTEM,
    userPromptTemplate: SECURITY_USER,
  },
  gap: {
    name: 'gap',
    description: 'Spec vs implementation gap analysis',
    systemPrompt: GAP_SYSTEM,
    userPromptTemplate: GAP_USER,
  },
  architecture: {
    name: 'architecture',
    description: 'High-level architecture and coupling review',
    systemPrompt: ARCHITECTURE_SYSTEM,
    userPromptTemplate: ARCHITECTURE_USER,
  },
  quality: {
    name: 'quality',
    description: 'Code quality and maintainability review',
    systemPrompt: QUALITY_SYSTEM,
    userPromptTemplate: QUALITY_USER,
  },
}

export function getPreset(name: string): AuditPreset {
  const preset = PRESETS[name]
  if (!preset) {
    throw new Error(`Unknown preset "${name}". Available: ${Object.keys(PRESETS).join(', ')}`)
  }
  return preset
}
