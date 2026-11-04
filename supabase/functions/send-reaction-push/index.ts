import { createClient } from "npm:@supabase/supabase-js@2.49.1"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const LABELS: Record<string, string> = {
  fist: "👊",
  fire: "🔥",
  clap: "👏",
  heart: "❤️",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")
  const mailto = Deno.env.get("VAPID_MAILTO") ?? "mailto:hello@dayact.app"

  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "Missing env" }), { status: 500 })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const activityId = body.activityId as string
  const emoji = body.emoji as string
  if (!activityId || !emoji) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: activity } = await admin
    .from("activities")
    .select("id,user_id,title")
    .eq("id", activityId)
    .maybeSingle()

  if (!activity || activity.user_id === userData.user.id) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", activity.user_id)

  webpush.setVapidDetails(mailto, publicKey, privateKey)
  const label = LABELS[emoji] ?? "✨"
  const title = "Dayact cheer"
  const msg = `${label} on "${activity.title}"`

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body: msg, url: "/today" }),
      )
    } catch {
      /* ignore */
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
