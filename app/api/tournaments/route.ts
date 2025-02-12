import { NextResponse } from "next/server"

export async function GET() {
  // Return an empty array as there are no tournaments yet
  const tournaments = []

  return NextResponse.json(tournaments)
}

