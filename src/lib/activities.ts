import { addDays, differenceInCalendarDays, endOfWeek, format, startOfWeek } from 'date-fns'
import { supabase } from './supabase'

export type ActivityStatus = 'planned' | 'in_progress' | 'done' | 'skipped'

export type Activity = {
  id: string
  user_id: string
  title: string
  notes: string | null
  planned_for: string
  planned_time: string | null
  status: ActivityStatus
  progress_pct: number
  completed_at: string | null
  follow_up_on: string | null
  follow_up_done: boolean
  reschedule_reason: string | null
  continued_from_id: string | null
  mood: number | null
  created_at: string
}

export type ActivityWithOwner = Activity & {
  display_name: string
  avatar_emoji: string | null
}

export type ProfileRow = {
  id: string
  display_name: string
  avatar_emoji: string | null
}

export type Result<T> = { data: T; error: null } | { data: null; error: string }

export const ACTIVITIES_CHANGED_EVENT = 'dayact:activities-changed'

export function notifyActivitiesChanged(): void {
  window.dispatchEvent(new Event(ACTIVITIES_CHANGED_EVENT))
}

const ACTIVITY_COLUMNS =
  'id,user_id,title,notes,planned_for,planned_time,status,progress_pct,completed_at,follow_up_on,follow_up_done,reschedule_reason,continued_from_id,mood,created_at'

const PROFILE_COLUMNS = 'id,display_name,avatar_emoji,timezone,partner_nickname'

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

export function formatPlannedTime(plannedTime: string | null): string | null {
  if (!plannedTime) return null
  const slice = plannedTime.slice(0, 5)
  return /^\d{2}:\d{2}$/.test(slice) ? slice : null
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

  const profileById = new Map(
    (profiles ?? []).map((p: ProfileRow) => [p.id, p]),
  )

  return {
    data: rows.map((row) => {
      const profile = profileById.get(row.user_id)
      return {
        ...row,
        progress_pct: row.progress_pct ?? 0,
        display_name: profile?.display_name ?? '',
        avatar_emoji: profile?.avatar_emoji ?? null,
      }
    }),
    error: null,
  }
}

function normalizeActivityRow(row: Record<string, unknown>): Activity {
  return {
    ...(row as Activity),
    progress_pct: Number(row.progress_pct ?? 0),
  }
}

export async function listByDate(plannedFor: string): Promise<Result<ActivityWithOwner[]>> {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_COLUMNS)
    .eq('planned_for', plannedFor)
    .order('planned_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return attachDisplayNames((data ?? []).map(normalizeActivityRow))
}

export async function listActivitiesInRange(
  fromDate: string,
  toDate: string,
): Promise<Result<ActivityWithOwner[]>> {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_COLUMNS)
    .gte('planned_for', fromDate)
    .lte('planned_for', toDate)
    .order('planned_for', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return attachDisplayNames((data ?? []).map(normalizeActivityRow))
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

  return attachDisplayNames((data ?? []).map(normalizeActivityRow))
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

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function rescheduleFollowUp(
  id: string,
  followUpOn: string,
  reason: string,
): Promise<Result<ActivityWithOwner>> {
  const trimmed = reason.trim().slice(0, 200)
  if (!trimmed) {
    return { data: null, error: 'Add a short reason to reschedule.' }
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ follow_up_on: followUpOn, reschedule_reason: trimmed })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function reschedulePlannedFor(
  id: string,
  plannedFor: string,
  reason: string,
): Promise<Result<ActivityWithOwner>> {
  const trimmed = reason.trim().slice(0, 200)
  if (!trimmed) {
    return { data: null, error: 'Add a short reason to reschedule.' }
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ planned_for: plannedFor, reschedule_reason: trimmed })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
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

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
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

export function productivityForDay(
  items: ActivityWithOwner[],
  userId: string,
): number | null {
  const mine = items.filter((row) => row.user_id === userId && row.status !== 'skipped')
  if (mine.length === 0) return null

  const denom = mine.filter(
    (row) => row.status === 'planned' || row.status === 'in_progress' || row.status === 'done',
  ).length
  if (denom === 0) return null

  const doneCount = mine.filter((row) => row.status === 'done').length
  const inProgress = mine.filter((row) => row.status === 'in_progress')
  const numer =
    doneCount * 100 + inProgress.reduce((sum, row) => sum + (row.progress_pct || 0), 0)

  return Math.round(numer / (denom * 100) * 100)
}

export type CreateActivityInput = {
  userId: string
  title: string
  notes: string | null
  planned_for: string
  planned_time?: string | null
  follow_up_on: string | null
  continued_from_id?: string | null
}

export async function create(input: CreateActivityInput): Promise<Result<ActivityWithOwner>> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: input.userId,
      title: input.title,
      notes: input.notes,
      planned_for: input.planned_for,
      planned_time: input.planned_time ?? null,
      follow_up_on: input.follow_up_on,
      continued_from_id: input.continued_from_id ?? null,
    })
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load created activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export type UpdateActivityInput = {
  title: string
  notes: string | null
  planned_for: string
  planned_time: string | null
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
      planned_time: input.planned_time,
      follow_up_on: input.follow_up_on,
    })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
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
  const patch: Record<string, unknown> = { status, completed_at: completedAt }
  if (status === 'done') {
    patch.progress_pct = 100
  }
  if (status === 'planned') {
    patch.progress_pct = 0
  }

  const { data, error } = await supabase
    .from('activities')
    .update(patch)
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function setActivityMood(id: string, mood: number | null): Promise<Result<ActivityWithOwner>> {
  if (mood !== null && (mood < 1 || mood > 5)) {
    return { data: null, error: 'Mood must be 1–5.' }
  }
  const { data, error } = await supabase
    .from('activities')
    .update({ mood })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()
  if (error) return { data: null, error: error.message }
  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }
  return { data: withOwner.data[0], error: null }
}

export async function listMoodInsights(userId: string): Promise<
  Result<{ title: string; avg: number; count: number }[]>
> {
  const { data, error } = await supabase
    .from('activities')
    .select('title,mood')
    .eq('user_id', userId)
    .eq('status', 'done')
    .not('mood', 'is', null)
  if (error) return { data: null, error: error.message }
  const buckets = new Map<string, { sum: number; count: number }>()
  for (const row of data ?? []) {
    const title = (row.title as string).trim()
    if (!title) continue
    const b = buckets.get(title) ?? { sum: 0, count: 0 }
    b.sum += Number(row.mood)
    b.count += 1
    buckets.set(title, b)
  }
  const list = [...buckets.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([title, v]) => ({ title, avg: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
  return { data: list, error: null }
}

export async function markInProgress(
  id: string,
  progressPct = 50,
): Promise<Result<ActivityWithOwner>> {
  const pct = Math.min(100, Math.max(1, progressPct))
  const { data, error } = await supabase
    .from('activities')
    .update({ status: 'in_progress', progress_pct: pct, completed_at: null })
    .eq('id', id)
    .select(ACTIVITY_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const withOwner = await attachDisplayNames([normalizeActivityRow(data)])
  if (withOwner.error || !withOwner.data?.[0]) {
    return { data: null, error: withOwner.error ?? 'Failed to load activity' }
  }

  return { data: withOwner.data[0], error: null }
}

export async function continueTomorrow(
  activity: ActivityWithOwner,
): Promise<Result<ActivityWithOwner>> {
  const tomorrow = localDateString(addDays(new Date(), 1))

  const { data: existing, error: findError } = await supabase
    .from('activities')
    .select('id')
    .eq('continued_from_id', activity.id)
    .eq('planned_for', tomorrow)
    .eq('status', 'planned')
    .maybeSingle()

  if (findError) {
    return { data: null, error: findError.message }
  }

  if (existing) {
    const { data: row, error: loadError } = await supabase
      .from('activities')
      .select(ACTIVITY_COLUMNS)
      .eq('id', existing.id)
      .single()
    if (loadError) {
      return { data: null, error: loadError.message }
    }
    const withOwner = await attachDisplayNames([normalizeActivityRow(row)])
    if (withOwner.error || !withOwner.data?.[0]) {
      return { data: null, error: withOwner.error ?? 'Failed to load activity' }
    }
    return { data: withOwner.data[0], error: null }
  }

  const progressResult = await markInProgress(activity.id, activity.progress_pct || 50)
  if (progressResult.error) {
    return progressResult
  }

  const createResult = await create({
    userId: activity.user_id,
    title: activity.title,
    notes: activity.notes,
    planned_for: tomorrow,
    planned_time: activity.planned_time,
    follow_up_on: activity.follow_up_on,
    continued_from_id: activity.id,
  })

  return createResult
}

export async function remove(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('activities').delete().eq('id', id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

export async function getMyProfile(
  userId: string,
): Promise<
  Result<{
    display_name: string
    avatar_emoji: string | null
    timezone: string
    partner_nickname: string | null
  }>
> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: {
      display_name: data?.display_name ?? '',
      avatar_emoji: data?.avatar_emoji ?? null,
      timezone: data?.timezone ?? 'UTC',
      partner_nickname: data?.partner_nickname ?? null,
    },
    error: null,
  }
}

const MAX_PARTNER_NICKNAME = 40

export async function updatePartnerNickname(
  userId: string,
  partnerNickname: string | null,
): Promise<Result<{ partner_nickname: string | null }>> {
  const trimmed = partnerNickname?.trim() ?? ''
  const normalized = trimmed ? trimmed.slice(0, MAX_PARTNER_NICKNAME) : null

  const { data, error } = await supabase
    .from('profiles')
    .update({ partner_nickname: normalized })
    .eq('id', userId)
    .select('partner_nickname')
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: { partner_nickname: data.partner_nickname ?? null }, error: null }
}

export async function updateDisplayName(
  userId: string,
  displayName: string,
): Promise<Result<{ display_name: string; avatar_emoji: string | null }>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: {
      display_name: data.display_name,
      avatar_emoji: data.avatar_emoji ?? null,
    },
    error: null,
  }
}

const MAX_EMOJI_GRAPHEMES = 8

export function isValidAvatarEmoji(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)]
  return segments.length >= 1 && segments.length <= MAX_EMOJI_GRAPHEMES
}

export async function updateAvatarEmoji(
  userId: string,
  avatarEmoji: string | null,
): Promise<Result<{ display_name: string; avatar_emoji: string | null }>> {
  const normalized = avatarEmoji?.trim() || null
  if (normalized && !isValidAvatarEmoji(normalized)) {
    return { data: null, error: 'Pick one emoji for your avatar.' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_emoji: normalized })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: {
      display_name: data.display_name,
      avatar_emoji: data.avatar_emoji ?? null,
    },
    error: null,
  }
}

export function sortActivitiesForDay(
  items: ActivityWithOwner[],
  currentUserId: string,
): ActivityWithOwner[] {
  const statusRank = (status: ActivityStatus) => {
    if (status === 'planned') return 0
    if (status === 'in_progress') return 1
    return 2
  }

  return [...items].sort((a, b) => {
    const aOwn = a.user_id === currentUserId ? 0 : 1
    const bOwn = b.user_id === currentUserId ? 0 : 1
    if (aOwn !== bOwn) return aOwn - bOwn

    const aStatus = statusRank(a.status)
    const bStatus = statusRank(b.status)
    if (aStatus !== bStatus) return aStatus - bStatus

    const aTime = a.planned_time ?? ''
    const bTime = b.planned_time ?? ''
    if (aTime !== bTime) return aTime.localeCompare(bTime)

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

export function partnerAvatarLabel(activity: Pick<ActivityWithOwner, 'display_name' | 'avatar_emoji'>): string {
  if (activity.avatar_emoji?.trim()) return activity.avatar_emoji.trim()
  return ownerInitial(activity.display_name)
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
  _currentUserId: string,
): Promise<Result<{ id: string; display_name: string; avatar_emoji: string | null } | null>> {
  const { data: partnerId, error: rpcError } = await supabase.rpc('partner_id')
  if (rpcError) {
    return { data: null, error: rpcError.message }
  }
  if (!partnerId) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', partnerId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data) {
    return { data: null, error: null }
  }

  return {
    data: {
      id: data.id,
      display_name: data.display_name,
      avatar_emoji: data.avatar_emoji ?? null,
    },
    error: null,
  }
}

export type PartnerCandidate = {
  id: string
  display_name: string
  avatar_emoji: string | null
}

export async function listPartnerCandidates(): Promise<Result<PartnerCandidate[]>> {
  const { data, error } = await supabase.rpc('list_partner_candidates')
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as PartnerCandidate[], error: null }
}

export async function ensureDefaultPartnerLink(): Promise<Result<null>> {
  const candidates = await listPartnerCandidates()
  if (candidates.error) {
    return { data: null, error: candidates.error }
  }
  if (candidates.data?.length !== 1) {
    return { data: null, error: null }
  }

  const only = candidates.data[0]
  const { data: linked, error: rpcError } = await supabase.rpc('partner_id')
  if (rpcError) {
    return { data: null, error: rpcError.message }
  }
  if (linked === only.id) {
    return { data: null, error: null }
  }

  return setPartner(only.id)
}

export async function setPartner(partnerId: string): Promise<Result<null>> {
  const { error } = await supabase.rpc('set_partner', { p_partner_id: partnerId })
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: null, error: null }
}

export function weekRangeLocal(reference: Date = new Date()): { from: string; to: string } {
  const start = startOfWeek(reference, { weekStartsOn: 1 })
  const end = endOfWeek(reference, { weekStartsOn: 1 })
  return { from: localDateString(start), to: localDateString(end) }
}

export type WeeklyScoreBreakdown = {
  donePoints: number
  perfectDayBonus: number
  followUpPoints: number
  overduePenalty: number
  total: number
}

export function computeWeeklyScore(
  items: ActivityWithOwner[],
  openFollowups: ActivityWithOwner[],
  userId: string,
  weekStart: string,
  weekEnd: string,
): WeeklyScoreBreakdown {
  const mine = items.filter((row) => row.user_id === userId)
  const donePoints = mine.filter((row) => row.status === 'done').length * 10

  const days = new Set(mine.map((row) => row.planned_for))
  let perfectDayBonus = 0
  for (const day of days) {
    const dayItems = mine.filter((row) => row.planned_for === day)
    if (dayItems.length === 0) continue
    const open = dayItems.some((row) => row.status === 'planned' || row.status === 'in_progress')
    const hasAction = dayItems.some((row) => row.status === 'done' || row.status === 'skipped')
    if (!open && hasAction) perfectDayBonus += 25
  }

  let followUpPoints = 0
  for (const row of mine) {
    if (
      row.follow_up_done &&
      row.follow_up_on &&
      row.follow_up_on >= weekStart &&
      row.follow_up_on <= weekEnd
    ) {
      followUpPoints += 5
    }
  }

  let overduePenalty = 0
  const myOpenFollowups = openFollowups.filter((row) => row.user_id === userId)
  for (const row of myOpenFollowups) {
    if (row.follow_up_on && row.follow_up_on < weekEnd) {
      overduePenalty += 5
    }
  }

  const total = donePoints + perfectDayBonus + followUpPoints - overduePenalty
  return { donePoints, perfectDayBonus, followUpPoints, overduePenalty, total }
}
