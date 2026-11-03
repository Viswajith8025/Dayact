import { readFileSync, writeFileSync } from 'node:fs'

const key = process.argv[2]?.trim()
if (!key) {
  console.log('Usage: node scripts/set-gemini-env.mjs YOUR_KEY')
  process.exit(1)
}

let content
try {
  content = readFileSync('.env', 'utf8')
} catch {
  content = ''
}

const line = `GEMINI_API_KEY=${key}`
if (/^GEMINI_API_KEY=/m.test(content)) {
  content = content.replace(/^GEMINI_API_KEY=.*$/m, line)
} else {
  content = content.trimEnd() + (content.endsWith('\n') || content.length === 0 ? '' : '\n') + line + '\n'
}

writeFileSync('.env', content)
console.log('Updated .env GEMINI_API_KEY (length', key.length + ')')
