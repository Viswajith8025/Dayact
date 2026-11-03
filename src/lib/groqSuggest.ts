import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

type SuggestResponse = {
  suggestions?: string[]
  error?: string
}

async function suggestViaDevProxy(hint: string): Promise<SuggestResponse> {
  const response = await fetch('/api/suggest-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hint: hint.trim().slice(0, 500) }),
  })
  const payload = (await response.json()) as SuggestResponse
  if (!response.ok) {
    return { error: payload.error ?? 'Could not reach AI. Try again.' }
  }
  return payload
}

async function suggestViaEdge(hint: string): Promise<SuggestResponse> {
  const { data, error } = await supabase.functions.invoke<SuggestResponse>('suggest-activity', {
    body: { hint: hint.trim().slice(0, 500) },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = (await error.context.json()) as SuggestResponse
        if (payload.error) {
          return { error: payload.error }
        }
      } catch {
        /* use generic message below */
      }
    }
    return { error: error.message || 'Could not reach AI. Try again.' }
  }

  if (data?.error) {
    return { error: data.error }
  }

  return data ?? { error: 'No suggestions returned. Try again.' }
}

export async function suggestActivityTitles(
  hint: string,
): Promise<{ data: string[] | null; error: string | null }> {
  const trimmed = hint.trim().slice(0, 500)
  const result = import.meta.env.DEV
    ? await suggestViaDevProxy(trimmed)
    : await suggestViaEdge(trimmed)

  if (result.error) {
    return { data: null, error: result.error }
  }

  if (!result.suggestions?.length) {
    return { data: null, error: 'No suggestions returned. Try again.' }
  }

  return { data: result.suggestions, error: null }
}
