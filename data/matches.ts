export interface PlayerInMatch {
    id: string
    name: string
    seed: number
  }
  
  export interface Set {
    player1Score: number
    player2Score: number
  }
  
  export interface Match {
    id: string
    tournamentId: string
    round: string
    player1: PlayerInMatch
    player2: PlayerInMatch
    sets: Set[]
    winnerId: string
  }
  
  // Matches for the Lift Off tournament
  const liftOffMatches: Match[] = [
    {
      id: "lift-off-play-in",
      tournamentId: "lift-off",
      round: "Semi-final Play-in",
      player1: {
        id: "will-simon",
        name: "Will Simon",
        seed: 5,
      },
      player2: {
        id: "caleb-breslin",
        name: "Caleb Breslin",
        seed: 4,
      },
      sets: [
        {
          player1Score: 7,
          player2Score: 11,
        },
      ],
      winnerId: "caleb-breslin",
    },
    {
      id: "lift-off-semi-1",
      tournamentId: "lift-off",
      round: "Semi-final 1",
      player1: {
        id: "isaac-tullis",
        name: "Isaac Tullis",
        seed: 2,
      },
      player2: {
        id: "jason-grossman",
        name: "Jason Grossman",
        seed: 3,
      },
      sets: [
        {
          player1Score: 11,
          player2Score: 9,
        },
        {
          player1Score: 11,
          player2Score: 7,
        },
      ],
      winnerId: "isaac-tullis",
    },
    {
      id: "lift-off-semi-2",
      tournamentId: "lift-off",
      round: "Semi-final 2",
      player1: {
        id: "deven-amann-rao",
        name: "Deven Amann-Rao",
        seed: 1,
      },
      player2: {
        id: "caleb-breslin",
        name: "Caleb Breslin",
        seed: 4,
      },
      sets: [
        {
          player1Score: 12,
          player2Score: 10,
        },
        {
          player1Score: 11,
          player2Score: 7,
        },
      ],
      winnerId: "deven-amann-rao",
    },
    {
      id: "lift-off-final",
      tournamentId: "lift-off",
      round: "Final",
      player1: {
        id: "deven-amann-rao",
        name: "Deven Amann-Rao",
        seed: 1,
      },
      player2: {
        id: "isaac-tullis",
        name: "Isaac Tullis",
        seed: 2,
      },
      sets: [
        {
          player1Score: 11,
          player2Score: 9,
        },
        {
          player1Score: 11,
          player2Score: 7,
        },
      ],
      winnerId: "deven-amann-rao",
    },
  ]
  
  // All matches
  const matches: Match[] = [...liftOffMatches]
  
  export function getMatchesByTournament(tournamentId: string): Match[] {
    return matches.filter((match) => match.tournamentId === tournamentId)
  }
  
  export function getMatchesByPlayerAndTournament(playerId: string, tournamentId: string): Match[] {
    return matches.filter(
      (match) => match.tournamentId === tournamentId && (match.player1.id === playerId || match.player2.id === playerId),
    )
  }
  
  export function getMatchesByPlayer(playerId: string): Match[] {
    return matches.filter((match) => match.player1.id === playerId || match.player2.id === playerId)
  }
  