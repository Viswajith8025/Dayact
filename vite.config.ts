// @ts-nocheck — Vite config runs on Node.
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']

function suggestActivityDevProxy(apiKey: string | undefined) {
  return {
    name: 'dayact-suggest-activity-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/suggest-activity', (req, res, next) => {
        if (req.method !== 'POST') return next()
        if (!apiKey) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'AI is not configured.' }))
          return
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          void (async () => {
            try {
              const parsed = JSON.parse(body || '{}')
              const mode = parsed.mode
              const system =
                mode === 'plan_week'
                  ? 'Given recent activity history JSON, suggest a balanced week plan. Return JSON only: {"days":[{"date":"YYYY-MM-DD","suggestions":["title1","title2"]}]}. Use the next 7 calendar days starting tomorrow. Max 3 suggestions per day.'
                  : 'Suggest daily activity titles for a two-person shared planner. Return JSON only: {"suggestions":["title1","title2","title3"]}. Each title at most 120 characters.'
              const userText =
                mode === 'plan_week'
                  ? String(parsed.history ?? '')
                  : String(parsed.hint ?? '') || 'Suggest three useful things for today.'
              let lastError = 'Could not reach AI.'
              for (const model of GEMINI_MODELS) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
                const geminiRes = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `${system}\n\n${userText}` }] }],
                    generationConfig: { maxOutputTokens: 2048, responseMimeType: 'application/json' },
                  }),
                })
                if (!geminiRes.ok) {
                  if ([404, 503, 429].includes(geminiRes.status)) continue
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: `Gemini failed (${geminiRes.status})` }))
                  return
                }
                const json = await geminiRes.json()
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text
                if (typeof text !== 'string') {
                  res.statusCode = 502
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Bad AI response' }))
                  return
                }
                const out = JSON.parse(text)
                if (mode === 'plan_week') {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ days: out.days ?? [] }))
                  return
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ suggestions: out.suggestions ?? [] }))
                return
              }
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: lastError }))
            } catch {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Bad request' }))
            }
          })()
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('VITE_')) {
      process.env[key] = value
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      suggestActivityDevProxy(env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Dayact',
          short_name: 'Dayact',
          display: 'standalone',
          start_url: '/',
          theme_color: '#f2f2f5',
          background_color: '#f2f2f5',
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
        injectManifest: {
          globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2}'],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'react-vendor'
            }
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('date-fns')) return 'date-fns'
            if (id.includes('lucide-react')) return 'icons'
          },
        },
      },
    },
  }
})
