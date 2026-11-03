import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const key = env.GEMINI_API_KEY?.replace(/^["']|["']$/g, '').trim()
if (!key) {
  console.log('no GEMINI_API_KEY in .env')
  process.exit(1)
}
if (!key.startsWith('AIza') && !key.startsWith('AQ.')) {
  console.log(
    'GEMINI_API_KEY must start with AIza or AQ. (from Google AI Studio). Run: node scripts/check-gemini-env.mjs',
  )
  process.exit(1)
}

const model = process.argv[2] ?? 'gemini-3.5-flash-lite'
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Return JSON only: {"suggestions":["a","b","c"]}' }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 128 },
  }),
})
console.log('model', model, 'status', res.status)
console.log((await res.text()).slice(0, 500))
