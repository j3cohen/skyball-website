// app/api/telegram-alert/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { tournamentName, fullName } = await req.json()

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.error("Missing TELEGRAM credentials")
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 500 })
    }

    const message = `
*NEW TOURNAMENT REGISTRATION*

*Tournament:* ${tournamentName}
*Player:* ${fullName}

_Registered at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern_
`

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    const result = await tgRes.json()
    return NextResponse.json({ success: result.ok }, { status: 200 })
  } catch (err) {
    console.error("Telegram alert failed", err)
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 })
  }
}
