import { createClient } from "npm:@supabase/supabase-js@2.49.1"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
}

function localParts(timezone: string, now = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const parts = fmt.formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
    const y = get("year")
    const m = get("month")
    const d = get("day")
    const hour = Number(get("hour"))
    return { date: `${y}-${m}-${d}`, hour: Number.isFinite(hour) ? hour : -1 }
  } catch {
    const utc = now.toISOString()
    return { date: utc.slice(0, 10), hour: now.getUTCHours() }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim()
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret")
    if (header !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")
  const mailto = Deno.env.get("VAPID_MAILTO") ?? "mailto:hello@dayact.app"

  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "Missing env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey)
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,timezone,last_evening_nudge_date")
  const profileById = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  const { data: subs } = await supabase.from("push_subscriptions").select("user_id,endpoint,p256dh,auth")

  let sent = 0
  const now = new Date()

  for (const sub of subs ?? []) {
    const profile = profileById.get(sub.user_id) as
      | { id: string; timezone: string; last_evening_nudge_date: string | null }
      | undefined
    if (!profile) continue

    const tz = profile.timezone || "UTC"
    const { date: localDate, hour } = localParts(tz, now)
    if (hour !== 21) continue
    if (profile.last_evening_nudge_date === localDate) continue

    const partner = (profiles ?? []).find((p: { id: string }) => p.id !== profile.id) as
      | { id: string }
      | undefined
    if (!partner) continue

    const { count: myDone } = await supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "done")
      .eq("planned_for", localDate)

    if ((myDone ?? 0) > 0) continue

    const { count: partnerDone } = await supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", partner.id)
      .eq("status", "done")
      .eq("planned_for", localDate)

    if ((partnerDone ?? 0) === 0) continue

    const body =
      "Your partner logged wins today. Log one done item before bed and keep the joint streak alive."
    const title = "Dayact nudge"

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: "/today" }),
      )
      sent += 1
      await supabase
        .from("profiles")
        .update({ last_evening_nudge_date: localDate })
        .eq("id", profile.id)
    } catch {
      /* stale subscription */
    }
  }

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
