import { differenceInCalendarDays, format } from 'date-fns'
import { supabase } from './supabase'

export type ActivityStatus = 'planned' | 'done' | 'skipped'

export type Activity = {
  id: string
  user_id: string
  title: string
  notes: string | null
  planned_for: string
  status: ActivityStatus
  completed_at: string | null
  follow_up_on: string | null
  follow_up_done: boolean
  created_at: string
}

export type ActivityWithOwner = Activity & {
  display_name: string
}

export type Result<T> = { data: T; error: null } | { data: null; error: string }

export const ACTIVITIES_CHANGED_EVENT = 'dayact:activities-changed'

export function notifyActivitiesChanged(): void {
  window.dispatchEvent(new Event(ACTIVITIES_CHANGED_EVENT))
}

const ACTIVITY_COLUMNS =
  'id,user_id,title,notes,planned_for,status,completed_at,follow_up_on,follow_up_done,created_at'

const PROFILE_COLUMNS = 'id,display_name'

/** Local calendar date for API filters — never use toISOString().slice(0, 10). */
export function localDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function parsePlannedDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  if (Number.isNaN(parsed.getTime())) return null
  if (localDateString(parsed) !== value) return null
  return parsed
}

async function attachDisplayNames(rows: Activity[]): Promise<Result<ActivityWithOwner[]>> {
  if (rows.length === 0) {
    return { data: [], error: null }
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))]

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('id', userIds)

  if (profileError) {
    return { data: null, error: profileError.message }
  }

  const nameById = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]),
  )

  return {
    data: rows.map((row) => ({
      ...row,
      display_name: nameById.get(row.user_id) ?? '',
    })),
    error: null,
  }
}

export async function listByDate(plannedFor: string): Promise<Result<ActivityWithOwner[]>> {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_COLUMNS)
    .eq('planned_for', plannedFor)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return attachDisplayNames((data ?? []) as Activity[])
}

export async function listOpenFollowups(): Promise<Result<ActivityWithOwner[]>> {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_COLUMNS)
    .not('follow_up_on', 'is', null)
    .eq('follow_up_done', false)
    .order('follow_up_on', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return attachDisplayNames((data ?? []) as Activity[])
}

export async function countOwnFollowUpBadge(userId: string): Promise<Result<number>> {
  const today = localDateString()
  const { count, error } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('follow_up_done', false)
    .not('follow_up_on', 'is', null)
    .lte('follow_up_on', today)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: count ?? 0, error: null }
}

export async function setFollowUpDone(id: string): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .update({ follow_up_done: true })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([data as Activity])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function rescheduleFollowUp(
  id: string,
  followUpOn: string,
): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .update({ follow_up_on: followUpOn })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([data as Activity])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function clearFollowUp(id: string): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .update({ follow_up_on: null })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([data as Activity])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export type FollowUpGroup = 'overdue' | 'today' | 'upcoming'

export function groupOpenFollowups(
  items: ActivityWithOwner[],
  today: string = localDateString(),
): Record<FollowUpGroup, ActivityWithOwner[]> {
  const groups: Record<FollowUpGroup, ActivityWithOwner[]> = {
    overdue: [],
    today: [],
    upcoming: [],
  }

  for (const item of items) {
    if (!item.follow_up_on) continue
    if (item.follow_up_on < today) groups.overdue.push(item)
    else if (item.follow_up_on === today) groups.today.push(item)
    else groups.upcoming.push(item)
  }

  return groups
}

export function formatFollowUpRelative(followUpOn: string, today: string = localDateString()): string {
  const date = parsePlannedDate(followUpOn)
  const todayDate = parsePlannedDate(today)
  if (!date || !todayDate) return followUpOn

  const diff = differenceInCalendarDays(date, todayDate)
  if (diff < 0) {
    const days = Math.abs(diff)
    return days === 1 ? '1 day overdue' : `${days} days overdue`
  }
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return format(date, 'EEE d MMM')
}

export function formatPlannedForSecondary(plannedFor: string): string {
  const date = parsePlannedDate(plannedFor)
  if (!date) return `Planned for ${plannedFor}`
  return `Planned for ${format(date, 'EEE d MMM')}`
}

export type CreateActivityInput = {
  userId: string
  title: string
  notes: string | null
  planned_for: string
  follow_up_on: string | null
}

export async function create(input: CreateActivityInput): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: input.userId,
      title: input.title,
      notes: input.notes,
      planned_for: input.planned_for,
      follow_up_on: input.follow_up_on,
    })
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([data as Activity])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load created activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export type UpdateActivityInput = {
  title: string
  notes: string | null
  planned_for: string
  follow_up_on: string | null
}

export async function update(
  id: string,
  input: UpdateActivityInput,
): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .update({
      title: input.title,
      notes: input.notes,
      planned_for: input.planned_for,
      follow_up_on: input.follow_up_on,
    })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([data as Activity])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load updated activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function setStatus(
  id: string,
  status: ActivityStatus,
  completedAt: string | null,
): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .update({ status, completed_at: completedAt })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([data as Activity])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function remove(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('activities').delete().eq('id', id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

export async function getMyProfile(userId: string): Promise<Result<{ display_name: string }>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: { display_name: data?.display_name ?? '' }, error: null }
}

export async function updateDisplayName(
  userId: string,
  displayName: string,
): Promise<Result<{ display_name: string }>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: { display_name: data.display_name }, error: null }
}

export function sortActivitiesForDay(
  items: ActivityWithOwner[],
  currentUserId: string,
): ActivityWithOwner[] {
  const statusRank = (status: ActivityStatus) => {
    if (status === 'planned') return 0
    return 1
  }

  return [...items].sort((a, b) => {
    const aOwn = a.user_id === currentUserId ? 0 : 1
    const bOwn = b.user_id === currentUserId ? 0 : 1
    if (aOwn !== bOwn) return aOwn - bOwn

    const aStatus = statusRank(a.status)
    const bStatus = statusRank(b.status)
    if (aStatus !== bStatus) return aStatus - bStatus

    return a.created_at.localeCompare(b.created_at)
  })
}

export function userBadgeColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 42% 38%)`
}

export function ownerInitial(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) return '?'
  const match = trimmed.match(/[A-Za-z0-9]/)
  return match ? match[0].toUpperCase() : '?'
}

export type AchievementDefinition = {
  code: string
  title: string
  description: string
  sort_order: number
}

export type UserAchievement = {
  code: string
  earned_at: string
}

const ACHIEVEMENT_COLUMNS = 'code,title,description,sort_order'
const USER_ACHIEVEMENT_COLUMNS = 'code,earned_at'

export const COUNT_BASED_ACHIEVEMENTS = new Set(['first_activity', 'ten_done', 'fifty_done'])

export const ACHIEVEMENT_DONE_TARGETS: Record<string, number> = {
  first_activity: 1,
  ten_done: 10,
  fifty_done: 50,
}

export const ACHIEVEMENTS_AWARDED_EVENT = 'dayact:achievements-awarded'

export function notifyAchievementsAwarded(codes: string[]): void {
  if (codes.length === 0) return
  window.dispatchEvent(new CustomEvent<string[]>(ACHIEVEMENTS_AWARDED_EVENT, { detail: codes }))
}

export async function awardAchievements(): Promise<Result<string[]>> {
  const { data, error } = await supabase.rpc('award_achievements')

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data ?? []) as string[], error: null }
}

export async function listAchievementCatalog(): Promise<Result<AchievementDefinition[]>> {
  const { data, error } = await supabase
    .from('achievements')
    .select(ACHIEVEMENT_COLUMNS)
    .order('sort_order', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data ?? []) as AchievementDefinition[], error: null }
}

export async function listUserAchievements(userId: string): Promise<Result<UserAchievement[]>> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(USER_ACHIEVEMENT_COLUMNS)
    .eq('user_id', userId)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data ?? []) as UserAchievement[], error: null }
}

export async function countDoneActivities(userId: string): Promise<Result<number>> {
  const { count, error } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'done')

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: count ?? 0, error: null }
}

export async function getTeammateProfile(
  currentUserId: string,
): Promise<Result<{ id: string; display_name: string } | null>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .neq('id', currentUserId)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data) {
    return { data: null, error: null }
  }

  return { data: data as { id: string; display_name: string }, error: null }
}
