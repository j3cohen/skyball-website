import { NextResponse } from 'next/server';

// Define a type for the tournament structure (modify as needed)
type Tournament = {
  id: string;
  name: string;
  date: string;
  location: string;
};

export async function GET() {
  // Explicitly type the empty array
  const tournaments: Tournament[] = []

  return NextResponse.json(tournaments);
}
