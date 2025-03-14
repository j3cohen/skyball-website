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
    name: "SkyBall™ Open: Launched",
    date: "March 23, 2024",
    location: "The Ten, Brooklyn, New York City",
    registrationFee: "$20",
    description:
      "Join us for the first ever SkyBall tournament – the best ever opportunity to become the number one SkyBall player in the world!",
    registrationLink: "/tournaments/1/register",
    // Additional details
    startTime: "3:30 PM",
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

