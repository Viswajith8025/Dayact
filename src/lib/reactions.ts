import { supabase } from './supabase'

export type ReactionEmoji = 'fist' | 'fire' | 'clap' | 'heart'

export const REACTION_UI: Record<ReactionEmoji, string> = {
  fist: '👊',
  fire: '🔥',
  clap: '👏',
  heart: '❤️',
}

export type ReactionRow = {
  id: string
  activity_id: string
  from_user_id: string
  emoji: ReactionEmoji
}

export async function upsertReaction(
  userId: string,
  activityId: string,
  emoji: ReactionEmoji,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reactions').upsert(
    { activity_id: activityId, from_user_id: userId, emoji },
    { onConflict: 'activity_id,from_user_id' },
  )
  if (error) return { error: error.message }

  void supabase.functions.invoke('send-reaction-push', { body: { activityId, emoji } })
  return { error: null }
}

export async function listReactionsForActivities(activityIds: string[]): Promise<Map<string, ReactionRow[]>> {
  const map = new Map<string, ReactionRow[]>()
  if (activityIds.length === 0) return map

  const { data, error } = await supabase
    .from('reactions')
    .select('id,activity_id,from_user_id,emoji')
    .in('activity_id', activityIds)

  if (error || !data) return map

  for (const row of data as ReactionRow[]) {
    const list = map.get(row.activity_id) ?? []
    list.push(row)
    map.set(row.activity_id, list)
  }
  return map
}

export function subscribeReactions(onChange: () => void): () => void {
  const channel = supabase
    .channel('dayact-reactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => onChange())
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
