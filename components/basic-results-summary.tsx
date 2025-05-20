// components/basic-results-summary.tsx
"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export interface Results {
  winner?: string
  runner_up?: string
  score?: string
}

interface BasicResultsSummaryProps {
  results: Results
}

export default function BasicResultsSummary({ results }: BasicResultsSummaryProps) {
  // only render if we actually have a winner
  if (!results.winner) return null

  const slugify = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-")

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-sky-600">Tournament Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.winner && (
            <div className="flex items-center">
              <Trophy className="w-5 h-5 mr-3 text-sky-600" />
              <span>
                Winner:{" "}
                <Link
                  href={`/players/${slugify(results.winner)}`}
                  className="text-sky-600 hover:underline"
                >
                  {results.winner}
                </Link>
              </span>
            </div>
          )}
          {results.runner_up && (
            <div className="flex items-center">
              <Trophy className="w-5 h-5 mr-3 text-sky-600 opacity-70" />
              <span>
                Runner-up:{" "}
                <Link
                  href={`/players/${slugify(results.runner_up)}`}
                  className="text-sky-600 hover:underline"
                >
                  {results.runner_up}
                </Link>
              </span>
            </div>
          )}
          {results.score && (
            <div className="flex items-center">
              <span className="ml-8">Final Score: {results.score}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
