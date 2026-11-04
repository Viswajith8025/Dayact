export type FollowUpTone = 'overdue' | 'today' | 'upcoming'

const OVERDUE_LINES = [
  'Your follow-up is giving side-eye. Go finish it.',
  'This task filed a missing-person report on you.',
  'Still waiting. The calendar is not amused.',
  'Overdue alert: your future self sent a strongly worded memo.',
  'Hungry for closure? This one’s still on the menu.',
]

const TODAY_LINES = [
  'Today is the day. Unless you enjoy suspense.',
  'Follow-up due today — knock it out and flex.',
  'The plan said today. The plan is optimistic but hopeful.',
  'One tap away from being the responsible one.',
  'Due today — delivery ETA: whenever you tap Done.',
]

const UPCOMING_LINES = [
  'Heads up — follow-up coming soon. No panic yet.',
  'Future you will thank present you. Maybe.',
  'Scheduled follow-up on the horizon. Stay ready.',
]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function followUpWittyLine(
  tone: FollowUpTone,
  activityId: string,
  followUpOn: string,
): string {
  const pool =
    tone === 'overdue' ? OVERDUE_LINES : tone === 'today' ? TODAY_LINES : UPCOMING_LINES
  const index = hashSeed(`${activityId}:${followUpOn}`) % pool.length
  return pool[index]!
}

export function followUpTone(followUpOn: string, today: string): FollowUpTone {
  if (followUpOn < today) return 'overdue'
  if (followUpOn === today) return 'today'
  return 'upcoming'
}

export const PUSH_TITLE = 'Dayact follow-up'

export function pushNotificationBody(
  tone: FollowUpTone,
  activityTitle: string,
  activityId: string,
  followUpOn: string,
): string {
  const witty = followUpWittyLine(tone, activityId, followUpOn)
  const title = activityTitle.trim() || 'Untitled'
  return `${title} — ${witty}`
}
