export type ReminderSuccess = {
  ok: true
  delivered: number
  subscriptions: number
  deduped?: boolean
}

export function reminderNote(
  result: ReminderSuccess | { ok: false; error: string },
  partnerName: string,
): string {
  if (!result.ok) return result.error
  if (result.deduped && result.delivered > 0) return 'Already poked today'
  if (result.delivered > 0) return 'Funny poke sent'
  if (result.subscriptions > 0) return "Couldn't deliver the poke. Try again."
  const name = partnerName.trim() || 'Your partner'
  return `${name} hasn't turned on notifications`
}
