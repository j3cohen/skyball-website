export interface Tournament {
  id: string
  name: string
  date: string
  location: string
  registrationFee: string
  description: string
  registrationLink: string
}

export const upcomingTournaments: Tournament[] = [
  {
    id: "1",
    name: "SkyBall™ Summer Slam",
    date: "July 15-16, 2023",
    location: "Central Park, New York City",
    registrationFee: "$50",
    description: "Join us for the biggest SkyBall™ event of the summer in the heart of New York City!",
    registrationLink: "/tournaments/1/register",
  },
  {
    id: "2",
    name: "West Coast SkyBall™ Open",
    date: "August 5-6, 2023",
    location: "Venice Beach, Los Angeles",
    registrationFee: "$60",
    description: "Experience SkyBall™ on the beautiful beaches of Los Angeles in this exciting open tournament.",
    registrationLink: "/tournaments/2/register",
  },
  {
    id: "3",
    name: "SkyBall™ Midwest Championship",
    date: "September 2-3, 2023",
    location: "Millennium Park, Chicago",
    registrationFee: "$55",
    description: "Compete for the title of Midwest SkyBall™ Champion in the Windy City!",
    registrationLink: "/tournaments/3/register",
  },
]

export interface PastTournament extends Tournament {
  winner: string
  runnerUp: string
  prizePool?: string
  pointsAwarded?: number
  bracket: string // URL to bracket image
}

export const pastTournaments: PastTournament[] = [
  {
    id: "past1",
    name: "SkyBall™ Spring Fling",
    date: "April 22-23, 2023",
    location: "Central Park, New York City",
    registrationFee: "$45",
    description: "The inaugural SkyBall™ tournament that kicked off the 2023 season!",
    registrationLink: "",
    winner: "Sarah Johnson",
    runnerUp: "Mike Thompson",
    prizePool: "$1,000",
    pointsAwarded: 100,
    bracket: "/images/brackets/spring-fling-bracket.png",
  },
  {
    id: "past2",
    name: "California SkyBall™ Classic",
    date: "May 13-14, 2023",
    location: "Balboa Park, San Diego",
    registrationFee: "$50",
    description: "SkyBall™ made its West Coast debut in this exciting tournament!",
    registrationLink: "",
    winner: "Alex Rodriguez",
    runnerUp: "Chris Lee",
    prizePool: "$1,500",
    pointsAwarded: 150,
    bracket: "/images/brackets/california-classic-bracket.png",
  },
]

