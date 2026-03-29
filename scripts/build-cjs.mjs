/**
 * Post-build script: convert ESM dist to CJS for Node.js require() compatibility.
 * Reads each .js file from dist/, rewrites import/export to require/module.exports,
 * and writes to dist/cjs/ with .cjs extension.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const cjsDir = join(distDir, 'cjs')

mkdirSync(cjsDir, { recursive: true })

function walkDir(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory() && entry !== 'cjs') {
      files.push(...walkDir(full))
    } else if (entry.endsWith('.js')) {
      files.push(full)
    }
  }
  return files
}

const jsFiles = walkDir(distDir)

for (const file of jsFiles) {
  let content = readFileSync(file, 'utf8')

  // Rewrite named imports: import { X } from './foo.js' -> const { X } = require('./foo.cjs')
  content = content.replace(
    /^import\s+\{([^}]+)\}\s+from\s+'(\.\/[^']+)\.js'/gm,
    (_, names, path) => `const {${names}} = require('${path}.cjs')`,
  )
  // Rewrite default imports: import X from './foo.js' -> const X = require('./foo.cjs').default
  content = content.replace(
    /^import\s+(\w+)\s+from\s+'(\.\/[^']+)\.js'/gm,
    (_, name, path) => `const ${name} = require('${path}.cjs').default`,
  )
  // Rewrite export { X } from './foo.js'
  content = content.replace(
    /^export\s+\{([^}]+)\}\s+from\s+'(\.\/[^']+)\.js'/gm,
    (_, names, path) => {
      const parts = names
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
      const requires = `const _re_${path.replace(/[./]/g, '_')} = require('${path}.cjs')`
      const exports_ = parts.map((n) => `Object.defineProperty(exports, '${n}', { get: () => _re_${path.replace(/[./]/g, '_')}.${n}, enumerable: true })`).join('\n')
      return `${requires}\n${exports_}`
    },
  )
  // Rewrite export { A, B }
  content = content.replace(/^export\s+\{([^}]+)\}/gm, (_, names) => {
    const parts = names
      .split(',')
      .map((n) => {
        const [local, exported] = n.trim().split(/\s+as\s+/)
        return `exports.${(exported || local).trim()} = ${local.trim()}`
      })
    return parts.join('\n')
  })
  // Rewrite export class / export function / export const
  content = content.replace(/^export (class |function |const |let |var )/gm, '$1')
  // Rewrite export default
  content = content.replace(/^export default /gm, 'module.exports.default = ')

  // Add 'use strict' header
  content = `'use strict';\n${content}`

  const relPath = relative(distDir, file)
  const cjsPath = join(cjsDir, relPath.replace(/\.js$/, '.cjs'))
  const cjsFileDir = join(cjsPath, '..')
  mkdirSync(cjsFileDir, { recursive: true })
  writeFileSync(cjsPath, content, 'utf8')
}

console.log(`CJS build complete: ${jsFiles.length} files written to dist/cjs/`)
