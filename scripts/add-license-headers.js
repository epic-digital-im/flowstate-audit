#!/usr/bin/env node
/* eslint-env node */
/**
 * Add SPDX license headers to source files.
 *
 * Usage:
 *   node scripts/add-license-headers.js          # Add headers to all files missing them
 *   node scripts/add-license-headers.js --check   # Check only (exit 1 if any missing)
 *   node scripts/add-license-headers.js --files file1.ts file2.ts  # Add to specific files
 */
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')

const SPDX_HEADER_TS = `// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Epic Digital Interactive Media LLC
`

const SPDX_HEADER_CSS = `/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright 2026 Epic Digital Interactive Media LLC */
`

function hasLicenseHeader(content) {
  if (!content || content.length === 0) {
    return false
  }
  return content.includes('SPDX-License-Identifier')
}

function getHeaderForExtension(ext) {
  switch (ext) {
    case '.css':
    case '.scss':
      return SPDX_HEADER_CSS
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
    default:
      return SPDX_HEADER_TS
  }
}

function addLicenseHeader(content, ext) {
  if (hasLicenseHeader(content)) {
    return content
  }

  const header = getHeaderForExtension(ext)
  const lines = content.split('\n')
  const preservedLines = []
  let startIndex = 0

  // Preserve shebang
  if (lines[0] && lines[0].startsWith('#!')) {
    preservedLines.push(lines[0])
    startIndex = 1
  }

  // Preserve eslint-env comments at the top
  if (lines[startIndex] && /^\s*\/\*\s*eslint-env\s/.test(lines[startIndex])) {
    preservedLines.push(lines[startIndex])
    startIndex++
  }

  const restOfFile = lines.slice(startIndex).join('\n')

  if (preservedLines.length > 0) {
    return `${preservedLines.join('\n')}\n${header}\n${restOfFile}`
  }

  return `${header}\n${restOfFile}`
}

/**
 * Walk a directory tree and return all source files that should carry headers.
 * Both packages/ and example/ are scanned. The intentionally-vulnerable
 * example app still gets headers so license provenance is preserved.
 */
function getSourceFiles() {
  const targetDirs = ['packages', 'example']
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss'])
  const skipDirs = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo', '.cache'])
  const files = []

  function walk(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue
        walk(full)
      } else if (entry.isFile()) {
        if (exts.has(path.extname(entry.name))) {
          files.push(full)
        }
      }
    }
  }

  for (const top of targetDirs) {
    walk(path.join(ROOT_DIR, top))
  }
  return files
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  const filesIndex = args.indexOf('--files')

  let files
  if (filesIndex !== -1) {
    files = args.slice(filesIndex + 1).map(f => path.resolve(f))
  } else {
    files = getSourceFiles()
  }

  const missing = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    if (!hasLicenseHeader(content)) {
      missing.push(file)
      if (!checkOnly) {
        const ext = path.extname(file)
        const updated = addLicenseHeader(content, ext)
        fs.writeFileSync(file, updated, 'utf-8')
      }
    }
  }

  if (checkOnly) {
    if (missing.length > 0) {
      console.error(`${missing.length} files missing SPDX license headers:`)
      for (const f of missing.slice(0, 20)) {
        console.error(`  ${path.relative(ROOT_DIR, f)}`)
      }
      if (missing.length > 20) {
        console.error(`  ... and ${missing.length - 20} more`)
      }
      process.exit(1)
    } else {
      console.error('All source files have SPDX license headers.')
      process.exit(0)
    }
  } else {
    if (missing.length > 0) {
      console.error(`Added SPDX license headers to ${missing.length} files.`)
    } else {
      console.error('All source files already have SPDX license headers.')
    }
  }
}

module.exports = {
  SPDX_HEADER_TS,
  SPDX_HEADER_CSS,
  hasLicenseHeader,
  addLicenseHeader,
  getSourceFiles,
  getHeaderForExtension,
}
