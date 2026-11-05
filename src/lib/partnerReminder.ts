import { supabase } from './supabase'

export type PartnerReminderResult =
  | { ok: true; deduped?: boolean }
  | { ok: false; error: string }

export async function sendPartnerReminder(activityId: string): Promise<PartnerReminderResult> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; deduped?: boolean; error?: string }>(
    'send-partner-reminder',
    { body: { activityId } },
  )

  if (error) {
    const msg = error.message || 'Could not send reminder.'
    if (msg.includes('Edge Function')) {
      return { ok: false, error: 'Reminder service is down — try again in a minute.' }
    }
    return { ok: false, error: msg }
  }

  if (data?.error) {
    return { ok: false, error: data.error }
  }

  return { ok: true, deduped: data?.deduped }
}
