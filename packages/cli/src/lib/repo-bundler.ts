// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

export interface BundleOptions {
  /** Repo root to bundle. */
  root: string
  /** Additional exclude globs (substring match against the relative path). */
  exclude?: string[]
  /** Additional include globs (if non-empty, ONLY these paths are included). */
  include?: string[]
  /** File extensions to include (no leading dot). Defaults to a code/doc set. */
  extensions?: string[]
  /** Hard cap on bundled bytes; overflow files are skipped with a warning. */
  maxBytes?: number
}

export interface BundleStats {
  filesIncluded: number
  filesSkipped: number
  bytes: number
  estimatedTokens: number
  topPackages: Array<{ path: string; bytes: number }>
}

export interface BundleResult {
  text: string
  stats: BundleStats
  manifest: ManifestEntry[]
}

export interface ManifestEntry {
  path: string
  bytes: number
  reason?: 'skipped-binary' | 'skipped-excluded' | 'skipped-extension' | 'skipped-too-large'
}

const DEFAULT_EXTENSIONS = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'sol',
  'md',
  'mdx',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'sh',
  'fish',
  'sql',
  'rs',
  'py',
  'go',
  'html',
  'css',
  'scss',
  'graphql',
  'gql',
  'env.example',
]

const DEFAULT_EXCLUDES = [
  'node_modules',
  '.git/',
  '.worktrees/',
  'dist/',
  'build/',
  'out/',
  '.next/',
  '.turbo/',
  '.cache/',
  'coverage/',
  '.nyc_output/',
  '.open-next/',
  '.wrangler/',
  'next-env.d.ts',
  '.tsbuildinfo',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  'bun.lockb',
  '.snap',
  '__snapshots__/',
  'generated/',
  '/vendor/',
  '.log',
  // Secrets — NEVER bundle these
  '.env',
  '.dev.vars',
  // Audits output dir (don't recursively include past audits)
  '/audits/',
]

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'svg',
  'pdf',
  'zip',
  'tar',
  'gz',
  'tgz',
  'bz2',
  '7z',
  'rar',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'mp3',
  'mp4',
  'mov',
  'webm',
  'wasm',
  'so',
  'dylib',
  'dll',
  'exe',
  'bin',
  'lockb',
])

const DEFAULT_PER_FILE_LIMIT = 2 * 1024 * 1024

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx < 0) return ''
  return filename.slice(idx + 1).toLowerCase()
}

function isBinaryByExtension(filename: string): boolean {
  return BINARY_EXTENSIONS.has(getExtension(filename))
}

function matchesAny(path: string, patterns: string[]): boolean {
  for (const p of patterns) {
    if (path.includes(p)) return true
  }
  return false
}

function looksBinaryFromContent(buf: Buffer): boolean {
  const slice = buf.subarray(0, Math.min(buf.length, 8192))
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) return true
  }
  return false
}

function* walk(root: string, current: string): Generator<string> {
  let entries
  try {
    entries = readdirSync(current, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(current, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      yield* walk(root, full)
    } else if (entry.isFile()) {
      yield full
    }
  }
}

export function bundleRepo(options: BundleOptions): BundleResult {
  const root = resolve(options.root)
  const extensions = new Set((options.extensions ?? DEFAULT_EXTENSIONS).map(e => e.toLowerCase()))
  const userExcludes = options.exclude ?? []
  const includes = options.include ?? []
  const maxBytes = options.maxBytes ?? DEFAULT_PER_FILE_LIMIT

  const allExcludes = [...DEFAULT_EXCLUDES, ...userExcludes]

  const manifest: ManifestEntry[] = []
  const fileBlocks: string[] = []
  const packageBytes = new Map<string, number>()

  let bytes = 0
  let filesIncluded = 0
  let filesSkipped = 0

  for (const fullPath of walk(root, root)) {
    const rel = relative(root, fullPath).split(sep).join('/')

    if (matchesAny(`/${rel}`, allExcludes) || matchesAny(rel, allExcludes)) {
      manifest.push({ path: rel, bytes: 0, reason: 'skipped-excluded' })
      filesSkipped++
      continue
    }

    if (includes.length > 0 && !matchesAny(rel, includes)) {
      manifest.push({ path: rel, bytes: 0, reason: 'skipped-excluded' })
      filesSkipped++
      continue
    }

    if (isBinaryByExtension(rel)) {
      manifest.push({ path: rel, bytes: 0, reason: 'skipped-binary' })
      filesSkipped++
      continue
    }

    const ext = getExtension(rel)
    const basename = rel.split('/').pop() ?? ''
    const isWellKnownExtensionless =
      basename === 'Dockerfile' ||
      basename === 'Makefile' ||
      basename === '.gitignore' ||
      basename === '.dockerignore' ||
      basename === '.editorconfig' ||
      basename === '.npmrc' ||
      basename === 'CLAUDE.md' ||
      basename === 'CNAME'
    if (ext && !extensions.has(ext) && !isWellKnownExtensionless) {
      manifest.push({ path: rel, bytes: 0, reason: 'skipped-extension' })
      filesSkipped++
      continue
    }

    let size: number
    try {
      size = statSync(fullPath).size
    } catch {
      filesSkipped++
      continue
    }
    if (size > maxBytes) {
      manifest.push({ path: rel, bytes: size, reason: 'skipped-too-large' })
      filesSkipped++
      continue
    }

    let buf: Buffer
    try {
      buf = readFileSync(fullPath)
    } catch {
      filesSkipped++
      continue
    }
    if (looksBinaryFromContent(buf)) {
      manifest.push({ path: rel, bytes: size, reason: 'skipped-binary' })
      filesSkipped++
      continue
    }

    const content = buf.toString('utf-8')
    fileBlocks.push(`<file path="${rel}">\n${content}\n</file>`)
    manifest.push({ path: rel, bytes: size })
    bytes += size
    filesIncluded++

    const segs = rel.split('/')
    const pkg = segs.length >= 2 ? segs.slice(0, 2).join('/') : segs[0]
    packageBytes.set(pkg, (packageBytes.get(pkg) ?? 0) + size)
  }

  const text = fileBlocks.join('\n\n')
  // ~2.5 chars/token is a calibrated empirical estimate for mixed
  // TypeScript + JSON + markdown. Used to gate against --max-input-tokens.
  const estimatedTokens = Math.ceil(text.length / 2.5)

  const topPackages = [...packageBytes.entries()]
    .map(([path, bytes]) => ({ path, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10)

  return {
    text,
    stats: { filesIncluded, filesSkipped, bytes, estimatedTokens, topPackages },
    manifest,
  }
}
