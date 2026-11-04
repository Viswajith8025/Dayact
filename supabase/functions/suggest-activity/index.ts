const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const TITLE_PROMPT =
  'Suggest daily activity titles for a two-person shared planner. Return JSON only: {"suggestions":["title1","title2","title3"]}. Each title at most 120 characters.'

const WEEK_PROMPT =
  'Given recent activity history JSON, suggest a balanced week plan. Return JSON only: {"days":[{"date":"YYYY-MM-DD","suggestions":["title1","title2"]}]}. Use the next 7 calendar days starting tomorrow. Max 3 suggestions per day.'

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function fetchGemini(apiKey: string, system: string, userText: string) {
  let lastError = "Could not reach AI."
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${userText}` }] }],
        generationConfig: { maxOutputTokens: 2048, responseMimeType: "application/json" },
      }),
    })
    if (!res.ok) {
      if (res.status === 404 || res.status === 503 || res.status === 429) continue
      return { error: `Gemini failed (${res.status})` }
    }
    const json = await res.json()
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== "string") return { error: "Bad AI response" }
    try {
      return { parsed: JSON.parse(text) }
    } catch {
      return { error: "Bad AI response" }
    }
  }
  return { error: lastError }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const key = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY")
  if (!key) {
    return jsonResponse({ error: "AI is not configured." }, 503)
  }

  const body = await req.json().catch(() => ({}))
  const mode = body.mode as string

  if (mode === "plan_week") {
    const result = await fetchGemini(key, WEEK_PROMPT, String(body.history ?? ""))
    if (result.error) return jsonResponse({ error: result.error }, 502)
    return jsonResponse({ days: result.parsed?.days ?? [] })
  }

  const hint = String(body.hint ?? "")
  const result = await fetchGemini(key, TITLE_PROMPT, hint || "Suggest three useful things for today.")
  if (result.error) return jsonResponse({ error: result.error }, 502)
  const suggestions = Array.isArray(result.parsed?.suggestions) ? result.parsed.suggestions : []
  return jsonResponse({ suggestions })
})
