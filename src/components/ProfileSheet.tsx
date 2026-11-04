import { useEffect, useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { SheetPortal } from './SheetPortal'
import { useAuth } from '../lib/auth'
import {
  getMyProfile,
  isValidAvatarEmoji,
  updateAvatarEmoji,
  updateDisplayName,
  updatePartnerNickname,
} from '../lib/activities'
import {
  getPushSubscriptionState,
  isPushConfigured,
  subscribeToFollowUpPush,
  unsubscribeFromFollowUpPush,
} from '../lib/push'
import { detectTimezone, updateProfileTimezone } from '../lib/streaks'

export const PROFILE_UPDATED_EVENT = 'dayact:profile-updated'

const EMOJI_PRESETS = ['😀', '🚀', '☕', '🎯', '💪', '🌿', '🔥', '✨', '🦊', '🐙', '🎸', '📚', '🏃', '🧠', '💼', '🌙']

type ProfileSheetProps = {
  open: boolean
  onClose: () => void
}

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [partnerNickname, setPartnerNickname] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [pushState, setPushState] = useState<'unsupported' | 'denied' | 'subscribed' | 'off'>('off')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setError(null)
    void getMyProfile(user.id).then((result) => {
      if (result.data) {
        setDisplayName(result.data.display_name)
        setPartnerNickname(result.data.partner_nickname ?? '')
        setAvatarEmoji(result.data.avatar_emoji ?? '')
        setTimezone(result.data.timezone || detectTimezone())
      }
    })
    void updateProfileTimezone(user.id, detectTimezone()).then((result) => {
      if (!result.error) setTimezone(detectTimezone())
    })
    void getPushSubscriptionState().then(setPushState)
  }, [open, user])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !user) return null

  async function handleSave() {
    if (saving || !user) return
    const trimmed = displayName.trim()
    if (!trimmed) {
      setError('Add a display name.')
      return
    }
    const emoji = avatarEmoji.trim()
    if (emoji && !isValidAvatarEmoji(emoji)) {
      setError('Pick one emoji for your avatar.')
      return
    }

    setSaving(true)
    setError(null)
    const nameResult = await updateDisplayName(user.id, trimmed)
    if (nameResult.error) {
      setSaving(false)
      setError(nameResult.error)
      return
    }
    const emojiResult = await updateAvatarEmoji(user.id, emoji || null)
    if (emojiResult.error) {
      setSaving(false)
      setError(emojiResult.error)
      return
    }
    const nickResult = await updatePartnerNickname(user.id, partnerNickname.trim() || null)
    if (nickResult.error) {
      setSaving(false)
      setError(nickResult.error)
      return
    }
    const tzResult = await updateProfileTimezone(user.id, timezone.trim() || detectTimezone())
    setSaving(false)
    if (tzResult.error) {
      setError(tzResult.error)
      return
    }
    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT))
    onClose()
  }

  async function togglePush() {
    if (pushBusy || !user) return
    setPushBusy(true)
    setError(null)
    if (pushState === 'subscribed') {
      const result = await unsubscribeFromFollowUpPush(user.id)
      if (result.error) setError(result.error)
      else setPushState('off')
    } else {
      const result = await subscribeToFollowUpPush(user.id)
      if (result.error) setError(result.error)
      else setPushState('subscribed')
    }
    setPushBusy(false)
  }

  return (
    <SheetPortal>
      <div
        className="sheet-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-sheet-title"
        onClick={onClose}
      >
        <div
          className="sheet-panel space-y-[var(--space-5)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sheet-grabber" aria-hidden />
          <h2 id="profile-sheet-title" className="typo-title text-[var(--color-text)]">
            Your profile
          </h2>
          <p className="typo-footnote text-[var(--color-text-muted)]">
            Signed in · your session stays on this device until you sign out.
          </p>

          <Input
            label="Display name"
            name="display_name"
            value={displayName}
            maxLength={80}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-describedby="profile-display-name-hint"
          />
          <p id="profile-display-name-hint" className="typo-footnote text-[var(--color-text-muted)]">
            Your name others see on shared tasks.
          </p>

          <Input
            label="Nickname for your partner"
            name="partner_nickname"
            value={partnerNickname}
            maxLength={40}
            onChange={(e) => setPartnerNickname(e.target.value)}
            aria-describedby="profile-partner-nickname-hint"
          />
          <p id="profile-partner-nickname-hint" className="typo-footnote text-[var(--color-text-muted)]">
            Shown on your device instead of their display name.
          </p>

          <div className="space-y-[var(--space-2)]">
            <span className="typo-footnote text-[var(--color-text-muted)]">Avatar emoji</span>
            <div className="flex flex-wrap gap-[var(--space-2)]">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`btn btn--icon btn--tertiary text-lg${avatarEmoji === emoji ? ' ring-2 ring-[var(--color-accent)]' : ''}`}
                  aria-label={`Use ${emoji}`}
                  onClick={() => setAvatarEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input
              label="Or type one emoji"
              name="avatar_emoji"
              value={avatarEmoji}
              maxLength={8}
              onChange={(e) => setAvatarEmoji(e.target.value)}
            />
          </div>

          <Input
            label="Timezone"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            aria-describedby="profile-timezone-hint"
          />
          <p id="profile-timezone-hint" className="typo-footnote text-[var(--color-text-muted)]">
            Used for joint streak and evening nudges. Updates from this device on open; save to keep your name and
            emoji changes.
          </p>

          <div className="space-y-[var(--space-2)]">
            <p className="typo-subhead text-[var(--color-text)]">Push reminders</p>
            <p className="typo-footnote text-[var(--color-text-muted)]">
              Partner pokes, overdue follow-ups, and evening nudges use the same notifications. Turn
              them on here so nothing gets stuck in silent mode.
            </p>
            {isPushConfigured() ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  loading={pushBusy}
                  disabled={pushState === 'unsupported' || pushState === 'denied'}
                  onClick={() => void togglePush()}
                >
                  {pushState === 'subscribed' ? 'Turn off notifications' : 'Allow notifications'}
                </Button>
                {pushState === 'denied' ? (
                  <p className="typo-footnote text-[var(--color-text-muted)]">
                    Blocked in browser settings — allow notifications for this site, then try again.
                  </p>
                ) : pushState === 'subscribed' ? (
                  <p className="typo-footnote text-[var(--color-text-muted)]">
                    On — your partner’s Remind taps and due follow-ups can reach you.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="typo-footnote text-[var(--color-text-muted)]">
                Reminders are not configured on this site yet (missing VAPID public key on the build).
              </p>
            )}
          </div>

          {error ? (
            <p role="alert" className="typo-subhead text-[var(--color-danger)]">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
            <Button type="button" variant="secondary" sheet className="sm:flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" sheet className="sm:flex-1" loading={saving} onClick={() => void handleSave()}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
