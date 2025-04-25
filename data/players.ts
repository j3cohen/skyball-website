export interface Player {
    id: string
    name: string
    hometown: string
    headshot: string
    fullBodyPhoto?: string
    totalPoints: number
    age?: number
    record?: string
    highestRank?: {
      rank: number
      date: string
    }
    tournaments: {
      id: string
      name: string
      date: string
      points: number
      countedForRankings: boolean
    }[]
  }
  
  export const players: Player[] = [
    {
      id: "deven-amann-rao",
      name: "Deven Amann-Rao",
      hometown: "New York, NY",
      headshot: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/deven-hs.png",
      fullBodyPhoto: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/deven-full-body.png",
      totalPoints: 118,
      age: 25,
      record: "2-0",
      highestRank: {
        rank: 1,
        date: "Current",
      },
      tournaments: [
        {
          id: "lift-off",
          name: "SkyBall™ Open: Lift Off",
          date: "April 24, 2025",
          points: 118,
          countedForRankings: true,
        },
      ],
    },
    {
      id: "isaac-tullis",
      name: "Isaac Tullis",
      hometown: "Brooklyn, NY",
      headshot: "/thoughtful-urbanite.png",
      totalPoints: 66,
      age: 30,
      record: "1-1",
      highestRank: {
        rank: 2,
        date: "Current",
      },
      tournaments: [
        {
          id: "lift-off",
          name: "SkyBall™ Open: Lift Off",
          date: "April 24, 2025",
          points: 66,
          countedForRankings: true,
        },
      ],
    },
    {
      id: "caleb-breslin",
      name: "Caleb Breslin",
      hometown: "Queens, NY",
      headshot: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/caleb-breslin-hs.png",
      fullBodyPhoto: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/caleb-breslin-full-body.png",
      totalPoints: 33,
      age: 31,
      record: "1-1",
      highestRank: {
        rank: 3,
        date: "Current",
      },
      tournaments: [
        {
          id: "lift-off",
          name: "SkyBall™ Open: Lift Off",
          date: "April 24, 2025",
          points: 33,
          countedForRankings: true,
        },
      ],
    },
    {
      id: "jason-grossman",
      name: "Jason Grossman",
      hometown: "Manhattan, NY",
      headshot: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/jason-grossman-hs.png",
      fullBodyPhoto: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/jason-grossman-full-body.png",
      totalPoints: 12,
      age: 30,
      record: "0-1",
      highestRank: {
        rank: 4,
        date: "Current",
      },
      tournaments: [
        {
          id: "lift-off",
          name: "SkyBall™ Open: Lift Off",
          date: "April 24, 2025",
          points: 12,
          countedForRankings: true,
        },
      ],
    },
    {
      id: "will-simon",
      name: "Will Simon",
      hometown: "New York, NY",
      headshot: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/will-simon-hs.png",
      fullBodyPhoto: "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/will-simon-full-body.png",
      totalPoints: 4,
      age: 27,
      record: "0-1",
      highestRank: {
        rank: 5,
        date: "Current",
      },
      tournaments: [
        {
          id: "lift-off",
          name: "SkyBall™ Open: Lift Off",
          date: "April 24, 2025",
          points: 4,
          countedForRankings: true,
        },
      ],
    },
  ]
  
  export function calculateRankings(players: Player[]): (Player & { rank: number })[] {
    // Sort players by total points (descending)
    const sortedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints)
  
    // Assign ranks
    return sortedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }))
  }
  
  export function getPlayerById(id: string): Player | undefined {
    return players.find((player) => player.id === id)
  }
  