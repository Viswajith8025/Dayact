import { followUpTone, PUSH_TITLE, pushNotificationBody } from "../_shared/followUpCopy.ts"
import { createClient } from "npm:@supabase/supabase-js@2.49.1"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
}

type ActivityRow = {
  id: string
  user_id: string
  title: string
  follow_up_on: string
}

type SubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim()
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")
  const mailto = Deno.env.get("VAPID_MAILTO") ?? "mailto:hello@dayact.app"

  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase or VAPID env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey)
  const supabase = createClient(supabaseUrl, serviceKey)

  const today = new Date().toISOString().slice(0, 10)

  const { data: activities, error: actError } = await supabase
    .from("activities")
    .select("id,user_id,title,follow_up_on")
    .eq("follow_up_done", false)
    .not("follow_up_on", "is", null)
    .lte("follow_up_on", today)

  if (actError) {
    return new Response(JSON.stringify({ error: actError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let sent = 0
  let failed = 0

  for (const activity of (activities ?? []) as ActivityRow[]) {
    const tone = followUpTone(activity.follow_up_on, today)
    const body = pushNotificationBody(tone, activity.title, activity.id, activity.follow_up_on)

    const { data: subs, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", activity.user_id)

    if (subError || !subs?.length) continue

    for (const sub of subs as SubscriptionRow[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title: PUSH_TITLE, body, url: "/followups" }),
        )
        sent += 1
      } catch {
        failed += 1
      }
    }
  }

  return new Response(JSON.stringify({ sent, failed, date: today }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
