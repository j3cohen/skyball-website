export interface Tournament {
  id: string
  name: string
  date: string
  location: string
  registrationFee: string
  description: string
  registrationLink: string
  // Additional fields for tournament details
  startTime?: string
  prizePool?: string
  pointsAwarded?: number
  format?: string
  maxParticipants?: number
  currentParticipants?: number
  contactEmail?: string
}

export const upcomingTournaments: Tournament[] = [
  {
    id: "1",
    name: "SkyBall™ Open: Lift Off",
    date: "April 24, 2025",
    location: "The Ten, 230 Bogart St, Brooklyn, NY",
    registrationFee: "$20",
    description:
      "Join us for the first ever SkyBall tournament – compete to win rankings points in the best ever opportunity to become the number one SkyBall player in the world!",
    registrationLink: "/tournaments/1/register",
    // Additional details
    startTime: "7:00 PM",
    prizePool: "$100",
    pointsAwarded: 100,
    format: "Single Elimination Bracket",
    maxParticipants: 8,
    currentParticipants: 0,
    contactEmail: "play@skyball.us",
  },
  // You can add more tournaments here
]

export interface PastTournament extends Tournament {
  winner: string
  runnerUp: string
  bracket: string // URL to bracket image
}

export const pastTournaments: PastTournament[] = [
  // Past tournaments data
]

