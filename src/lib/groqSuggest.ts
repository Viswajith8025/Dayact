import { supabase } from './supabase'

type SuggestResponse = { suggestions?: string[]; days?: { date: string; suggestions: string[] }[]; error?: string }

function friendlySuggestError(text: string): string {
  if (/GEMINI|not configured|Invalid or unauthorized/i.test(text)) {
    return 'Suggestions unavailable right now. Try again later.'
  }
  return text
}

async function suggestViaDevProxy(body: object): Promise<SuggestResponse> {
  const response = await fetch('/api/suggest-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as SuggestResponse
  if (!response.ok) return { error: payload.error ?? 'Could not reach AI. Try again.' }
  return payload
}

async function suggestViaEdge(body: object): Promise<SuggestResponse> {
  const { data, error } = await supabase.functions.invoke<SuggestResponse>('suggest-activity', { body })
  if (error) return { error: error.message || 'Could not reach AI. Try again.' }
  return data ?? { error: 'No suggestions returned.' }
}

export async function suggestActivityTitles(hint: string) {
  const trimmed = hint.trim().slice(0, 500)
  const result = import.meta.env.DEV
    ? await suggestViaDevProxy({ mode: 'titles', hint: trimmed })
    : await suggestViaEdge({ mode: 'titles', hint: trimmed })
  if (result.error) return { data: null as string[] | null, error: friendlySuggestError(result.error) }
  if (!result.suggestions?.length) return { data: null, error: friendlySuggestError('No suggestions returned.') }
  return { data: result.suggestions, error: null }
}

export async function suggestPlanWeek(historyJson: string) {
  const result = import.meta.env.DEV
    ? await suggestViaDevProxy({ mode: 'plan_week', history: historyJson.slice(0, 12000) })
    : await suggestViaEdge({ mode: 'plan_week', history: historyJson.slice(0, 12000) })
  if (result.error) return { data: null, error: friendlySuggestError(result.error) }
  if (!result.days?.length) return { data: null, error: friendlySuggestError('No plan returned.') }
  return { data: result.days, error: null }
}
