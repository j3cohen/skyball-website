export type Event = {
    id: string
    type: "tournament" | "clinic" | "open-play" | "special"
    name: string
    date: string
    time: string
    location: string
    description: string
    image: string
    participants?: string
    maxParticipants?: number
    currentParticipants?: number
    prize?: string
    skillLevel?: "beginner" | "intermediate" | "advanced" | "all"
    registrationFee?: string
    registrationDeadline?: string
    isPast?: boolean
    hasResults?: boolean
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
      date: "April 24, 2025", // Updated to yesterday
      time: "7:00 PM",
      location: "The Ten, 230 Bogart St, Brooklyn, NY",
      description:
        "Join us for the first ever SkyBall tournament – compete to win rankings points in the best ever opportunity to become the number one SkyBall player in the world!",
      image: "/urban-skyball-action.png",
      maxParticipants: 8,
      currentParticipants: 5,
      prize: "$100", // Updated from $500 to $100
      registrationFee: "$20",
      isPast: true, // Mark as past event
      hasResults: true, // Has results
      format: "Single Elimination Bracket",
      contactEmail: "play@skyball.us",
      results: {
        winner: "Deven Amann-Rao",
        runnerUp: "Isaac Tullis",
        score: "11-9, 11-7",
      },
    },
    {
      id: "open-play-april-29",
      type: "open-play",
      name: "McCarren Park Open Play",
      date: "April 29, 2025",
      time: "5:30 PM",
      location: "McCarren Park Blacktop (behind the tennis courts)",
      description:
        "Join us for an evening of casual SkyBall at our Brooklyn court! We'll organize mini-games and quick-play matches to 11 (win by 2) to ensure everyone gets plenty of court time. Perfect for players of all skill levels looking to practice and have fun.",
      image: "/skyball-open-session.png",
      skillLevel: "all",
      registrationFee: "$0",
      isPast: false,
      contactEmail: "play@skyball.us",
    },
  ]
  
  export function getEventById(id: string): Event | undefined {
    return events.find((event) => event.id === id)
  }
  
  export function getUpcomingEvents(): Event[] {
    return events.filter((event) => !event.isPast)
  }
  
  export function getPastEvents(): Event[] {
    return events.filter((event) => event.isPast)
  }
  