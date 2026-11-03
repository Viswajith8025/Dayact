// @ts-nocheck — Vite config runs on Node; dev-only Gemini proxy.
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { IncomingMessage, ServerResponse } from 'node:http'

const SYSTEM_PROMPT =
  'Suggest daily activity titles for a two-person shared planner. Return JSON only: {"suggestions":["title1","title2","title3"]}. Each title at most 120 characters, sentence case, specific and actionable, no emoji.'

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']

function readJsonBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function fetchGeminiWithModel(apiKey: string, hint: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const userText = hint.trim() || 'Suggest three useful things to plan for today.'

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser context: ${userText}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!geminiRes.ok) {
    const detail = (await geminiRes.text()).slice(0, 240)
    if (geminiRes.status === 404 || geminiRes.status === 503 || geminiRes.status === 429) {
      return { retry: true, error: `Model ${model} unavailable.` }
    }
    if (geminiRes.status === 400 || geminiRes.status === 403) {
      return {
        retry: false,
        error:
          'Invalid or unauthorized Gemini key. Use an API key from Google AI Studio (aistudio.google.com/apikey).',
      }
    }
    return { retry: false, error: `Gemini request failed (${geminiRes.status}). ${detail}` }
  }

  const geminiData = await geminiRes.json()
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') {
    return { retry: false, error: 'Could not read AI response. Try again.' }
  }

  try {
    const parsed = JSON.parse(text)
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((item) => typeof item === 'string')
          .map((item) => item.trim().slice(0, 120))
          .filter((item) => item.length > 0)
          .slice(0, 3)
      : []

    if (suggestions.length === 0) {
      return { retry: false, error: 'No suggestions returned. Try again.' }
    }

    return { retry: false, suggestions }
  } catch {
    return { retry: false, error: 'Could not read AI response. Try again.' }
  }
}

async function fetchGeminiSuggestions(apiKey: string, hint: string) {
  let lastError = 'Could not reach AI. Try again.'
  for (const model of GEMINI_MODELS) {
    const result = await fetchGeminiWithModel(apiKey, hint, model)
    if (result.suggestions) {
      return { suggestions: result.suggestions }
    }
    if (result.error) lastError = result.error
    if (!result.retry) break
  }
  return { error: lastError }
}

function geminiDevApiPlugin(mode: string): Plugin {
  return {
    name: 'gemini-suggest-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/suggest-activity' || req.method !== 'POST') {
          next()
          return
        }

        const env = loadEnv(mode, process.cwd(), '')
        const geminiKey = (env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY)?.trim()
        if (!geminiKey) {
          sendJson(res, 503, {
            error:
              'Add GEMINI_API_KEY=your-key to .env (not VITE_), then restart npm run dev.',
          })
          return
        }

        try {
          const raw = await readJsonBody(req)
          let hint = ''
          try {
            const payload = JSON.parse(raw)
            if (typeof payload.hint === 'string') {
              hint = payload.hint.trim().slice(0, 500)
            }
          } catch {
            sendJson(res, 400, { error: 'Invalid request body.' })
            return
          }

          const result = await fetchGeminiSuggestions(geminiKey, hint)
          if (result.error) {
            sendJson(res, 502, { error: result.error })
            return
          }
          sendJson(res, 200, result)
        } catch {
          sendJson(res, 502, { error: 'Could not reach AI. Try again.' })
        }
      })
    },
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('VITE_') || key === 'GEMINI_API_KEY') {
      process.env[key] = value
    }
  }

  return {
  plugins: [
    react(),
    tailwindcss(),
    geminiDevApiPlugin(mode),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dayact',
        short_name: 'Dayact',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0a7c74',
        background_color: '#f5f5f7',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  }
})
