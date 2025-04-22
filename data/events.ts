export type Event = {
    id: string
    type: "tournament" | "clinic" | "open-play" | "special"
    name: string
    date: string
    time: string
    location: string
    description: string
    image?: string
    participants?: string
    maxParticipants?: number
    currentParticipants?: number
    prize?: string
    skillLevel?: "beginner" | "intermediate" | "advanced" | "all"
    registrationFee?: string
    registrationDeadline?: string
    isPast?: boolean
    format?: string
    contactEmail?: string
    results?: {
      winner?: string
      runnerUp?: string
      score?: string
    }
  }
  
  export const events: Event[] = [
    {
      id: "lift-off",
      type: "tournament",
      name: "SkyBall™ Open: Lift Off",
      date: "April 24, 2025",
      time: "7:00 PM",
      location: "The Ten, 230 Bogart St, Brooklyn, NY",
      description:
        "Join us for the first ever SkyBall tournament – compete to win rankings points in the best ever opportunity to become the number one SkyBall player in the world!",
      maxParticipants: 8,
      currentParticipants: 6,
      prize: "$100",
      registrationFee: "$20",
      isPast: false,
      format: "Single Elimination Bracket",
      contactEmail: "play@skyball.us",
    },
    {
      id: "open-1",
      type: "open-play",
      name: "Bogart House Open Play",
      date: "April 29, 2025",
      time: "7:00 PM",
      location: "The Ten, 230 Bogart St, Brooklyn, NY",
      description:
        "Join us for an evening of casual SkyBall at our Brooklyn court! We'll organize mini-games and quick-play matches to 11 (win by 2) to ensure everyone gets plenty of court time. Perfect for players of all skill levels looking to practice and have fun.",
      maxParticipants: 8,
      skillLevel: "all",
      registrationFee: "$10",
      isPast: false,
      contactEmail: "play@skyball.us",
    },
  ]
  