import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SYSTEM_PROMPT =
  'Suggest daily activity titles for a two-person shared planner. Return JSON only: {"suggestions":["title1","title2","title3"]}. Each title at most 120 characters, sentence case, specific and actionable, no emoji.'

const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite"]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function fetchGeminiWithModel(apiKey: string, hint: string, model: string) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const userText = hint.trim() || "Suggest three useful things to plan for today."

  const geminiRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser context: ${userText}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    }),
  })

  if (!geminiRes.ok) {
    const detail = (await geminiRes.text()).slice(0, 200)
    if (geminiRes.status === 404) {
      return { retry: true as const, error: `Model ${model} unavailable.` }
    }
    if (geminiRes.status === 400 || geminiRes.status === 403) {
      return {
        retry: false as const,
        error:
          "Invalid or unauthorized Gemini key. Set GEMINI_API_KEY from Google AI Studio.",
      }
    }
    return {
      retry: false as const,
      error: `Gemini request failed (${geminiRes.status}). ${detail}`,
    }
  }

  const geminiData = await geminiRes.json()
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== "string") {
    return { retry: false as const, error: "Could not read AI response. Try again." }
  }

  try {
    const parsed = JSON.parse(text) as { suggestions?: unknown }
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 120))
        .filter((item) => item.length > 0)
        .slice(0, 3)
      : []

    if (suggestions.length === 0) {
      return { retry: false as const, error: "No suggestions returned. Try again." }
    }

    return { retry: false as const, suggestions }
  } catch {
    return { retry: false as const, error: "Could not read AI response. Try again." }
  }
}

async function fetchGeminiSuggestions(apiKey: string, hint: string) {
  let lastError = "Could not reach AI. Try again."
  for (const model of GEMINI_MODELS) {
    const result = await fetchGeminiWithModel(apiKey, hint, model)
    if ("suggestions" in result && result.suggestions) {
      return { suggestions: result.suggestions }
    }
    if (result.error) lastError = result.error
    if (!result.retry) break
  }
  return { error: lastError }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401)
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401)
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY")
  if (!geminiKey) {
    return json({ error: "AI is not configured on the server (add GEMINI_API_KEY secret)." }, 503)
  }

  let hint = ""
  try {
    const payload = await req.json()
    if (typeof payload.hint === "string") {
      hint = payload.hint.trim().slice(0, 500)
    }
  } catch {
    return json({ error: "Invalid request body." }, 400)
  }

  const result = await fetchGeminiSuggestions(geminiKey, hint)
  if ("error" in result && result.error) {
    return json({ error: result.error }, 502)
  }

  return json(result)
})
