export type FollowUpTone = "overdue" | "today" | "upcoming"

const OVERDUE_LINES = [
  "Your follow-up is giving side-eye. Go finish it.",
  "This task filed a missing-person report on you.",
  "Still waiting. The calendar is not amused.",
  "Overdue alert: your future self sent a strongly worded memo.",
  "Hungry for closure? This one’s still on the menu.",
]

const TODAY_LINES = [
  "Today is the day. Unless you enjoy suspense.",
  "Follow-up due today — knock it out and flex.",
  "The plan said today. The plan is optimistic but hopeful.",
  "One tap away from being the responsible one.",
  "Due today — delivery ETA: whenever you tap Done.",
]

const UPCOMING_LINES = [
  "Heads up — follow-up coming soon. No panic yet.",
  "Future you will thank present you. Maybe.",
  "Scheduled follow-up on the horizon. Stay ready.",
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
    tone === "overdue" ? OVERDUE_LINES : tone === "today" ? TODAY_LINES : UPCOMING_LINES
  const index = hashSeed(`${activityId}:${followUpOn}`) % pool.length
  return pool[index]!
}

export function followUpTone(followUpOn: string, today: string): FollowUpTone {
  if (followUpOn < today) return "overdue"
  if (followUpOn === today) return "today"
  return "upcoming"
}

const FOLLOWUP_PUSH_TITLES: Record<FollowUpTone, string[]> = {
  overdue: ["Still on the menu 👀", "Overdue delivery 📦", "Where's your order?"],
  today: ["Due today, chef 🍽️", "Today's special", "Hungry for done?"],
  upcoming: ["Heads up soon", "Follow-up warming up"],
}

const PARTNER_POKE_BODIES = [
  "{name} is poking you — \"{task}\" still wants attention.",
  "Hungry for progress? {name} says: finish \"{task}\".",
  "{name} sent a delivery-style poke: \"{task}\" is getting cold.",
  "Are you overdue for love? {name} nudged you about \"{task}\".",
  "{name} pinged you. \"{task}\" filed a missing-person report.",
  "Swiggy brain activated: {name} reminds you — \"{task}\".",
]

const EVENING_NUDGE_BODIES = [
  "{name} logged wins today. You at zero? Even Zomato would nudge by now.",
  "Joint streak SOS: {name} delivered. Add one done before bed?",
  "{name} ate their tasks. Your plate's still empty — quick win?",
  "Partner update from {name}: they're done. Your turn before sleep.",
]

function pickFromPool(pool: string[], seed: string): string {
  return pool[hashSeed(seed) % pool.length]!
}

export const PUSH_TITLE = "Dayact follow-up"

export function pushNotificationTitle(tone: FollowUpTone, activityId: string): string {
  return pickFromPool(FOLLOWUP_PUSH_TITLES[tone], activityId)
}

export function pushNotificationBody(
  tone: FollowUpTone,
  activityTitle: string,
  activityId: string,
  followUpOn: string,
): string {
  const witty = followUpWittyLine(tone, activityId, followUpOn)
  const title = activityTitle.trim() || "Untitled"
  return `${title} — ${witty}`
}

export function partnerPokePushCopy(
  senderName: string,
  activityTitle: string,
  activityId: string,
  sentOn: string,
): { title: string; body: string } {
  const name = senderName.trim() || "Your partner"
  const task = activityTitle.trim() || "that task"
  const template = pickFromPool(PARTNER_POKE_BODIES, `${activityId}:${sentOn}`)
  const body = template.replaceAll("{name}", name).replaceAll("{task}", task)
  return { title: `${name} poked you 👊`, body }
}

export function eveningNudgePushCopy(
  partnerName: string,
  profileId: string,
  localDate: string,
): { title: string; body: string } {
  const name = partnerName.trim() || "Your partner"
  const template = pickFromPool(EVENING_NUDGE_BODIES, `${profileId}:${localDate}`)
  const body = template.replaceAll("{name}", name)
  return { title: "Evening nudge 🌙", body }
}
