// app/actions/event-registration.ts
"use server"

import { redirect }                     from "next/navigation"
import { createServerActionClient }     from "@supabase/auth-helpers-nextjs"
import { cookies }                      from "next/headers"

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

  // 2) Grab hidden inputs
  const eventId   = String(formData.get("eventId"))
  const eventName = String(formData.get("eventName"))

  // 3) Lookup tournament cost
  const { data: tour, error: tourErr } = await supabase
    .from("tournaments")
    .select("points_value")
    .eq("id", eventId)
    .single()
  if (tourErr || !tour) {
    console.error("Tournament lookup failed", tourErr)
    return redirect(`/play/${eventId}?error=not-found`)
  }

  // 4) Find & consume one matching pass + register in one go
  const { error: txErr } = await supabase
    .rpc("consume_pass_and_register", {
      pass_id:       formData.get("passId"),   // you can append a hidden passId, or
      user_id:       userId,
      tournament_id: eventId,
    })

  if (txErr) {
    console.error("Registration transaction failed", txErr)
    // you can inspect txErr.message === 'insufficient pass quantity'
    return redirect(`/play/${eventId}?error=no-pass`)
  }

  // 5) (Optional) Telegram ping here…

  // 6) Success!
  return redirect(`/play/${eventId}?registered=1`)
}
