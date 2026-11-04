import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC)
}

export async function getPushSubscriptionState(): Promise<'unsupported' | 'denied' | 'subscribed' | 'off'> {
  if (!isPushConfigured() || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  return sub ? 'subscribed' : 'off'
}

export async function subscribeToFollowUpPush(userId: string): Promise<{ error: string | null }> {
  if (!VAPID_PUBLIC) {
    return { error: 'Push is not configured on this build.' }
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { error: 'Notifications are not supported in this browser.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { error: 'Notification permission was denied.' }
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { error: 'Could not read push subscription.' }
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function unsubscribeFromFollowUpPush(userId: string): Promise<{ error: string | null }> {
  if (!('serviceWorker' in navigator)) {
    return { error: null }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
    if (error) return { error: error.message }
  }

  return { error: null }
}
