import { supabase } from './supabase'

export type PartnerReminderResult =
  | { ok: true; deduped?: boolean }
  | { ok: false; error: string }

export async function sendPartnerReminder(activityId: string): Promise<PartnerReminderResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, error: 'Sign in again to send a reminder.' }
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!baseUrl || !anonKey) {
    return { ok: false, error: 'App is missing Supabase settings.' }
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}/functions/v1/send-partner-reminder`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activityId }),
    })
  } catch {
    return { ok: false, error: 'No connection — check network and try again.' }
  }

  type Payload = { ok?: boolean; deduped?: boolean; error?: string }
  let payload: Payload = {}
  try {
    payload = (await response.json()) as Payload
  } catch {
    /* non-JSON */
  }

  if (!response.ok) {
    return {
      ok: false,
      error: payload.error || `Reminder failed (${response.status}). Try again.`,
    }
  }

  if (payload.error) {
    return { ok: false, error: payload.error }
  }

  return { ok: true, deduped: payload.deduped }
}
