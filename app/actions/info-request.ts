"use server"

import { z } from "zod"

// Define validation schema for form data
const infoRequestSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address").optional(),
    phone: z.string().optional(),
    message: z.string().optional(),
    subject: z.string(),
    location: z.string().optional(),
    schoolInfo: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["contact"], // This creates a custom error path
  })

type InfoRequestData = z.infer<typeof infoRequestSchema>

// Map of subject types to emojis for Telegram messages
const subjectEmojis: Record<string, string> = {
  "School Information Request": "🏫",
  "Host Information Request": "🏆",
  "Where can I play?": "🗺️",
  "General Information Request": "ℹ️",
}

export async function submitInfoRequest(formData: FormData) {
  try {
    // Extract data from the form
    const data = {
      name: (formData.get("name") as string) || "",
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      message: (formData.get("message") as string) || "",
      subject: (formData.get("subject") as string) || "Information Request",
      location: (formData.get("location") as string) || "",
      schoolInfo: (formData.get("schoolInfo") as string) || "",
    }

    console.log(`Processing ${data.subject} request for:`, data.name)

    // Validate the data
    try {
      const validatedData = infoRequestSchema.parse(data)

      // Send Telegram notification
      console.log("Sending Telegram notification...")
      let success = false

      try {
        success = await sendTelegramNotification(validatedData)
      } catch (telegramError) {
        console.error("Error in Telegram notification:", telegramError)
        // Continue with the flow, don't throw
      }

      if (success) {
        console.log("Telegram notification sent successfully")
        return {
          success: true,
          message: "Thank you for your interest! We'll be in touch with you soon.",
        }
      } else {
        // If Telegram notification fails, try to send a failure notification
        console.error("Failed to send Telegram notification")
        try {
          await sendFailureNotification(validatedData)
        } catch (failureError) {
          console.error("Error sending failure notification:", failureError)
          // Continue with the flow, don't throw
        }

        return {
          success: false,
          message: "We're experiencing technical difficulties. Please email info@skyball.us or try again later.",
        }
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const fieldErrors = validationError.errors.reduce(
          (acc, err) => {
            const field = err.path[0] as string
            if (!acc[field]) {
              acc[field] = []
            }
            acc[field].push(err.message)
            return acc
          },
          {} as Record<string, string[]>,
        )

        return {
          success: false,
          message: "Please check your information and try again.",
          fieldErrors,
        }
      }

      console.error("Validation error:", validationError)
      return {
        success: false,
        message: "We couldn't process your information. Please email info@skyball.us or try again later.",
      }
    }
  } catch (error) {
    console.error("Info request error:", error)
    return {
      success: false,
      message: "We're experiencing technical difficulties. Please email info@skyball.us or try again later.",
    }
  }
}

async function sendTelegramNotification(data: InfoRequestData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    console.log("Telegram credentials check:", {
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
    })

    if (!botToken || !chatId) {
      console.error("Missing Telegram credentials")
      return false
    }

    // Get the appropriate emoji for the subject
    const emoji = subjectEmojis[data.subject] || "📝"

    // Format the message based on the data available
    let message = `
${emoji} *${data.subject}*

*Name:* ${data.name}
`

    if (data.email) {
      message += `*Email:* ${data.email}\n`
    }

    if (data.phone) {
      message += `*Phone:* ${data.phone}\n`
    }

    if (data.location) {
      message += `*Location:* ${data.location}\n`
    }

    if (data.schoolInfo) {
      message += `*School:* ${data.schoolInfo}\n`
    }

    if (data.message) {
      message += `\n*Message:*\n${data.message}\n`
    }

    message += `\n_Submitted at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern_`

    console.log("Attempting to send Telegram notification")

    // Send the message to Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ description: "Unknown error" }))
      console.error("Telegram API error:", errorData)
      return false
    }

    const result = await response.json().catch(() => ({ ok: false }))
    console.log("Telegram API response:", result)
    return result.ok
  } catch (error) {
    console.error("Error sending Telegram notification:", error)
    return false
  }
}

async function sendFailureNotification(data: InfoRequestData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      return false
    }

    const contactInfo = data.email ? data.email : data.phone

    const message = `
⚠️ *SYSTEM ALERT: Failed to send user notification*

We failed to send a notification for a ${data.subject} request from ${data.name} (${contactInfo || "no contact info"}).

Please check the system and contact the user manually.
`

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    return response.ok
  } catch (error) {
    console.error("Error sending failure notification:", error)
    return false
  }
}

