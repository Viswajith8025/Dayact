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
    return { ok: false, error: error.message || 'Could not send reminder.' }
  }

  if (data?.error) {
    return { ok: false, error: data.error }
  }

  return { ok: true, deduped: data?.deduped }
}
