import { addDays, format } from 'date-fns'
import { supabase } from './supabase'
import { localDateString } from './activities'

export type Challenge = {
  id: string
  created_by: string
  title: string
  target_count: number
  duration_days: number
  start_date: string
  status: 'active' | 'completed' | 'cancelled'
}

export type ChallengeProgress = {
  challenge_id: string
  user_id: string
  done_count: number
}

export async function listChallenges(): Promise<{ data: Challenge[]; error: string | null }> {
  const { data, error } = await supabase
    .from('challenges')
    .select('id,created_by,title,target_count,duration_days,start_date,status')
    .order('created_at', { ascending: false })
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as Challenge[], error: null }
}

export async function listChallengeProgress(
  challengeIds: string[],
): Promise<Map<string, ChallengeProgress[]>> {
  const map = new Map<string, ChallengeProgress[]>()
  if (challengeIds.length === 0) return map
  const { data } = await supabase
    .from('challenge_progress')
    .select('challenge_id,user_id,done_count')
    .in('challenge_id', challengeIds)
  for (const row of (data ?? []) as ChallengeProgress[]) {
    const list = map.get(row.challenge_id) ?? []
    list.push(row)
    map.set(row.challenge_id, list)
  }
  return map
}

export async function createChallenge(input: {
  userId: string
  title: string
  targetCount: number
  durationDays: number
  startDate: string
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      created_by: input.userId,
      title: input.title.trim().slice(0, 120),
      target_count: input.targetCount,
      duration_days: input.durationDays,
      start_date: input.startDate,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  const partnerRes = await supabase.rpc('partner_id')
  const partnerId = partnerRes.data as string | null
  const ids = [input.userId]
  if (partnerId) ids.push(partnerId)
  for (const uid of ids) {
    await supabase.from('challenge_progress').upsert({
      challenge_id: data.id,
      user_id: uid,
      done_count: 0,
    })
  }
  return { error: null }
}

export async function incrementChallengeProgress(userId: string): Promise<boolean> {
  let completedAny = false
  const today = localDateString()
  const { data: challenges } = await supabase
    .from('challenges')
    .select('id,target_count,duration_days,start_date,status')
    .eq('status', 'active')
  for (const c of challenges ?? []) {
    const end = format(addDays(new Date(c.start_date), c.duration_days - 1), 'yyyy-MM-dd')
    if (today < c.start_date || today > end) continue
    const { data: row } = await supabase
      .from('challenge_progress')
      .select('done_count')
      .eq('challenge_id', c.id)
      .eq('user_id', userId)
      .maybeSingle()
    const next = (row?.done_count ?? 0) + 1
    await supabase
      .from('challenge_progress')
      .upsert({ challenge_id: c.id, user_id: userId, done_count: next })
    if (next >= c.target_count) {
      await supabase.from('challenges').update({ status: 'completed' }).eq('id', c.id)
      completedAny = true
    }
  }
  return completedAny
}

export async function cancelChallenge(challengeId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId)
  return { error: error?.message ?? null }
}

export async function deleteChallenge(challengeId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId)
  return { error: error?.message ?? null }
}

/** When a done activity is removed, undo one progress tick for active challenges. */
export async function decrementChallengeProgressForDone(userId: string): Promise<void> {
  const today = localDateString()
  const { data: challenges } = await supabase
    .from('challenges')
    .select('id,duration_days,start_date,status')
    .eq('status', 'active')
  for (const c of challenges ?? []) {
    const end = format(addDays(new Date(c.start_date), c.duration_days - 1), 'yyyy-MM-dd')
    if (today < c.start_date || today > end) continue
    const { data: row } = await supabase
      .from('challenge_progress')
      .select('done_count')
      .eq('challenge_id', c.id)
      .eq('user_id', userId)
      .maybeSingle()
    const next = Math.max(0, (row?.done_count ?? 0) - 1)
    await supabase
      .from('challenge_progress')
      .upsert({ challenge_id: c.id, user_id: userId, done_count: next })
  }
}
