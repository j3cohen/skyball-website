// app/actions/event-registration.ts
"use server"

import { redirect } from "next/navigation"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function submitEventRegistration(formData: FormData) {
  const supabase = createServerActionClient({ cookies })

  // 1) Auth check
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return redirect(
      `/login?from=/play/${encodeURIComponent(formData.get("eventId") as string)}/register`
    )
  }
  const userId = session.user.id
  const userEmail = session.user.email

  // 2) Grab hidden inputs
  const eventId = String(formData.get("eventId"))

  // 3) Lookup tournament info
  const { data: tour, error: tourErr } = await supabase
    .from("tournaments")
    .select("points_value, name")
    .eq("id", eventId)
    .single()
  if (tourErr || !tour) {
    console.error("Tournament lookup failed", tourErr)
    return redirect(`/play/${eventId}?error=not-found`)
  }

  // 4) Register via RPC
  const { error: txErr } = await supabase.rpc("consume_pass_and_register", {
    pass_id: formData.get("passId"),
    user_id: userId,
    tournament_id: eventId,
  })

  if (txErr) {
    console.error("Registration transaction failed", txErr)
    return redirect(`/play/${eventId}?error=no-pass`)
  }

  // 5) Telegram notification
  await sendTournamentRegistrationNotification({
    tournamentName: tour.name,
    email: userEmail ?? "(no email found)",
  })

  // 6) Success
  return redirect(`/play/${eventId}?registered=1`)
}

async function sendTournamentRegistrationNotification(data: { tournamentName: string; email: string }) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials for tournament registration")
      return false
    }

    const message = `
*NEW TOURNAMENT REGISTRATION*

*A player just registered for:* ${data.tournamentName}

*Email:* ${data.email}

_Registered at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern_
`
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ description: "Unknown error" }))
      console.error("Telegram API error for tournament registration:", errorData)
      return false
    }

    const result = await response.json().catch(() => ({ ok: false }))
    console.log("Telegram tournament registration result:", result)
    return result.ok
  } catch (error) {
    console.error("Error sending tournament registration notification:", error)
    return false
  }
}
