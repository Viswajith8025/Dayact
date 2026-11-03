import { readFileSync } from 'node:fs'

try {
  const raw = readFileSync('.env', 'utf8')
  const lines = raw.split(/\r?\n/).filter((line) => /^GEMINI_API_KEY=/.test(line))
  console.log('GEMINI_API_KEY lines in .env:', lines.length)
  if (lines.length === 0) {
    console.log('Fix: open .env and set GEMINI_API_KEY=your-AIza-key (same line, no spaces around =)')
    process.exit(1)
  }
  if (lines.length > 1) {
    console.log('Warn: multiple GEMINI_API_KEY lines — remove duplicates; test script uses the first match in file order')
  }
  const value = lines[0].slice(lines[0].indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  console.log('Key length:', value.length, '(AIza keys ~39; AI Studio may also use AQ.… keys)')
  console.log('Starts with AIza:', value.startsWith('AIza'))
  console.log('Starts with AQ.:', value.startsWith('AQ.'))
  console.log('Contains whitespace:', /\s/.test(value))
  if (!value.startsWith('AIza') && !value.startsWith('AQ.')) {
    console.log('Fix: create key at https://aistudio.google.com/apikey')
  }
} catch {
  console.log('No .env file in project root')
  process.exit(1)
}
