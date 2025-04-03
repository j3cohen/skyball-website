"use server"

import { z } from "zod"

// Define validation schema for subscription data
const subscriptionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  zip: z.string().optional(),
  subject: z.string(),
})

type SubscriptionData = z.infer<typeof subscriptionSchema>

export async function submitSubscription(formData: FormData) {
  try {
    const data: SubscriptionData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      zip: (formData.get("zip") as string) || "",
      subject: formData.get("subject") as string,
    }

    console.log(`Processing subscription for: ${data.name}`)

    // Validate the data
    subscriptionSchema.parse(data)

    // Send Telegram notification
    console.log("Sending Telegram notification for subscription...")
    const success = await sendTelegramNotification(data)

    if (success) {
      console.log("Telegram notification sent successfully for subscription")
      console.log({ success: true, message: "Subscription successful! Thank you for subscribing." })
      return { success: true, message: "Subscription successful! Thank you for subscribing." }
    } else {
      console.error("Failed to send Telegram notification for subscription")
      return { success: false, message: "Subscription failed. Please try again later." }
    }
  } catch (error) {
    console.error("Subscription error:", error)
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path}: ${err.message}`).join(", ")
      return { success: false, message: `Validation error: ${errorMessages}` }
    }
    return { success: false, message: "Subscription failed. Please try again later." }
  }
}

async function sendTelegramNotification(data: SubscriptionData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials for subscription")
      return false
    }

    // Format the message
    const message = `
*Subscription! New Subscriber*

*Name:* ${data.name}
*Email:* ${data.email}
${data.zip ? `*Zip Code:* ${data.zip}` : ""}

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
      console.error("Telegram API error for subscription:", errorData)
      return false
    }
    const result = await response.json().catch(() => ({ ok: false }))
    console.log("Telegram API subscription response:", result)
    return result.ok
  } catch (error) {
    console.error("Error sending Telegram subscription notification:", error)
    return false
  }
}
