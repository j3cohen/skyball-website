// app/actions/view-deck.ts

"use server"

import { z } from "zod"

// Define validation schema for deck viewing data
const deckSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  subject: z.string(),
})

type ViewingData = z.infer<typeof deckSchema>

export async function viewDeck(formData: FormData) {
  try {
    const data: ViewingData = {
      email: formData.get("email") as string,
      subject: "Viewing Deck",
    }

    console.log(`Processing subscription for: ${data.email}`)

    // Validate the data
    deckSchema.parse(data)

    // Send Telegram notification
    console.log("ViewDeck notification for subscription...")
    const success = await sendTelegramNotification(data)

    if (success) {
      console.log("viewDeck notification sent successfully for subscription")
      console.log({ success: true, message: "" })
      return { success: true, message: "" }
    } else {
      console.error("")
      return { success: false, message: "Please try again later." }
    }
  } catch (error) {
    console.error("Subscription error:", error)
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path}: ${err.message}`).join(", ")
      return { success: false, message: `Validation error: ${errorMessages}` }
    }
    return { success: false, message: " Please try again later." }
  }
}

async function sendTelegramNotification(data: ViewingData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials for viewing deck")
      return false
    }

    // Format the message
    const message = `
*Deck Viewer! New Viewer*


*Email:* ${data.email}


_Submitted at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern_
`
    console.log("Attempting to send Telegram subscription notification")
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
      console.error("Tg API error for subscription:", errorData)
      return false
    }
    const result = await response.json().catch(() => ({ ok: false }))
    console.log("Tg API deck response:", result)
    return result.ok
  } catch (error) {
    console.error("Error sending tg viewing deck notification:", error)
    return false
  }
}
