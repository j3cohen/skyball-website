// File: app/actions/event-registration.ts
"use server"

import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function submitEventRegistration(formData: FormData) {
  // hidden inputs from the <form>
  const eventId   = formData.get("eventId")   as string
  const eventName = formData.get("eventName") as string
  const eventType = formData.get("eventType") as string

  // Supabase client that reads the Next.js auth cookie
  const supabase = createServerComponentClient({ cookies })

  // 1) session check
  const {
    data: { session },
    error: sessErr,
  } = await supabase.auth.getSession()
  if (sessErr || !session) {
    console.log("[reg] no session → login")
    return redirect(`/login?from=/play/${eventId}/register`)
  }
  const userId = session.user.id

  // 2) get tournament level
  const { data: tour, error: tourErr } = await supabase
    .from("tournaments")
    .select("points_value")
    .eq("id", eventId)
    .single()
  if (tourErr || !tour) {
    console.error("[reg] tournament lookup failed", tourErr)
    return redirect(`/play/${eventId}?error=event-not-found`)
  }

  // 3) find an available pass matching that level
  const { data: passRow, error: passErr } = await supabase
    .from("passes")
    .select("id, quantity_remaining, pass_types(points_value)")
    .eq("user_id", userId)
    .gt("quantity_remaining", 0)
    .eq("pass_types.points_value", tour.points_value)
    .limit(1)
    .single()

  if (passErr || !passRow) {
    console.log("[reg] no pass left", passErr)
    return redirect(`/play/${eventId}?error=no-pass`)
  }

  // 4) consume one pass + insert registration
  const newQty = passRow.quantity_remaining - 1

  const { error: updErr } = await supabase
    .from("passes")
    .update({ quantity_remaining: newQty })
    .eq("id", passRow.id)

  const { error: regErr } = await supabase
    .from("registrations")
    .insert({
      user_id:       userId,
      tournament_id: eventId,
      pass_id:       passRow.id,
    })

  if (updErr || regErr) {
    console.error("[reg] db write failed", updErr ?? regErr)
    return redirect(`/play/${eventId}?error=registration-failed`)
  }

  console.log(`[reg] user ${userId} registered for ${eventId}`)

  // 5) send Telegram alert (best-effort)
  try {
    await sendTelegramNotification({
      eventName,
      eventId,
      eventType,
      userId,
      userEmail: session.user.email,
    })
  } catch (err) {
    console.error("[reg] Telegram failed", err)
  }

  // 6) redirect back with success flag
  redirect(`/play/${eventId}?registered=1`)
}


// --- TELEGRAM HELPER ---
type TelegramPayload = {
  eventName:  string
  eventId:    string
  eventType:  string
  userId:     string
  userEmail?: string | null
}

async function sendTelegramNotification(p: TelegramPayload) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  })
  const header = p.eventType === "open-play"
    ? "🎾 New RSVP"
    : "🎾 New Registration"

  const message = `
*${header}*

*Event:* ${p.eventName} (\`${p.eventId}\`)
*Type:* ${p.eventType}

*User:*  
- ID: \`${p.userId}\`  
- Email: ${p.userEmail ?? "N/A"}

_Received at ${timestamp} Eastern_
  `.trim()

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    CHAT_ID,
        text:       message,
        parse_mode: "Markdown",
      }),
    }
  )

  if (!res.ok) {
    const info = await res.json().catch(() => ({}))
    throw new Error(`Telegram error ${res.status}: ${JSON.stringify(info)}`)
  }
}
