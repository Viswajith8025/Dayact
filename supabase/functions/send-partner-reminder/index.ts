import { partnerPokePushCopy } from "../_shared/followUpCopy.ts"
import { createClient } from "npm:@supabase/supabase-js@2.49.1"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (!activityId) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
  }

  const { data: partnerId, error: partnerErr } = await userClient.rpc("partner_id")
  if (partnerErr || !partnerId) {
    return new Response(JSON.stringify({ error: "No partner" }), { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: activity } = await admin
    .from("activities")
    .select("id,user_id,title,planned_for,status")
    .eq("id", activityId)
    .maybeSingle()

  if (!activity || activity.user_id !== partnerId) {
    return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403 })
  }

  if (activity.status === "done" || activity.status === "skipped") {
    return new Response(JSON.stringify({ error: "Already finished" }), { status: 400 })
  }

  const sentOn = new Date().toISOString().slice(0, 10)
  const { error: dedupeErr } = await admin.from("partner_reminders").insert({
    activity_id: activityId,
    from_user_id: userData.user.id,
    sent_on: sentOn,
  })

  if (dedupeErr?.code === "23505") {
    return new Response(JSON.stringify({ ok: true, deduped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (dedupeErr) {
    return new Response(JSON.stringify({ error: dedupeErr.message }), { status: 500 })
  }

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userData.user.id)
    .maybeSingle()

  const senderName = senderProfile?.display_name?.trim() || "Your partner"

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", activity.user_id)

  webpush.setVapidDetails(mailto, publicKey, privateKey)
  const { title, body } = partnerPokePushCopy(
    senderName,
    activity.title,
    activity.id,
    sentOn,
  )
  const url = `/today?date=${activity.planned_for}`

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url }),
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
