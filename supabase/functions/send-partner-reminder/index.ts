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

  try {
    return await handlePartnerReminder(req)
  } catch (err) {
    console.error("send-partner-reminder", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

async function handlePartnerReminder(req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")
  const mailto = Deno.env.get("VAPID_MAILTO") ?? "mailto:hello@dayact.app"

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing server config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const payload = await req.json().catch(() => ({}))
  const activityId = payload.activityId as string
  if (!activityId) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: partnerId, error: partnerErr } = await userClient.rpc("partner_id")
  if (partnerErr || !partnerId) {
    return new Response(JSON.stringify({ error: "No partner" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: activity } = await admin
    .from("activities")
    .select("id,user_id,title,planned_for,status,follow_up_on,follow_up_done")
    .eq("id", activityId)
    .maybeSingle()

  if (!activity || activity.user_id !== partnerId) {
    return new Response(JSON.stringify({ error: "Not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const openFollowUp = Boolean(activity.follow_up_on && !activity.follow_up_done)
  const canRemind =
    activity.status !== "skipped" &&
    (activity.status !== "done" || openFollowUp)

  if (!canRemind) {
    return new Response(JSON.stringify({ error: "Already finished" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
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
    return new Response(JSON.stringify({ error: dedupeErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
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

  if (publicKey && privateKey && (subs?.length ?? 0) > 0) {
    webpush.setVapidDetails(mailto, publicKey, privateKey)
    const { title, body: pushBody } = partnerPokePushCopy(
      senderName,
      activity.title,
      activity.id,
      sentOn,
    )
    const url = openFollowUp
      ? "/followups"
      : `/today?date=${activity.planned_for}`

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body: pushBody, url }),
        )
      } catch {
        /* ignore stale subscription */
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
