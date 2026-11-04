import { supabase } from './supabase'

export type JointStreakStats = {
  current: number
  best: number
}

export type Result<T> = { data: T; error: null } | { data: null; error: string }

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function fetchJointStreak(timezone?: string): Promise<Result<JointStreakStats>> {
  const tz = timezone?.trim() || detectTimezone()
  const { data, error } = await supabase.rpc('joint_streak_stats', { p_tz: tz })

  if (error) {
    return { data: null, error: error.message }
  }

  const row = Array.isArray(data) ? data[0] : data
  const current = Number(row?.current_streak ?? 0)
  const bestStored = Number(row?.best_streak ?? 0)

  if (current > 0) {
    await supabase.rpc('update_joint_streak_best', { p_current: current })
  }

  return {
    data: { current, best: Math.max(bestStored, current) },
    error: null,
  }
}

export async function updateProfileTimezone(userId: string, timezone: string): Promise<Result<null>> {
  const tz = timezone.trim() || 'UTC'
  const { error } = await supabase.from('profiles').update({ timezone: tz }).eq('id', userId)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
