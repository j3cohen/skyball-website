// components/rankings-content.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, CheckCircle, Star, Calendar, Users, HelpCircle } from "lucide-react"
import RankingsTable from "@/components/rankings-table"
import RaceTo300Announcement from "@/components/race-to-300-banner"

const rankingSections = [
  {
    title: "Tournament Categories & Points System",
    icon: Trophy,
    content: (
      <>
        <p className="mb-4">
          Tournaments are categorized by SkyBall™ administration based on size, importance, and tournament draw.
        </p>
        {/* <p className="mb-4">
          <em>No points awarded unless players win a minimum of one match in a given tournament</em>
        </p> */}
        <p className="mb-4">
          <em>
            If a player wins a minimum of one match in a given tournament, they are guaranteed a minimum of 25 points
            for their participation in said tournament
          </em>
        </p>
        <table className="w-full border-collapse border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Tournament Type</th>
              <th className="border border-gray-300 p-2">Champion Points</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">Sky 50</td>
              <td className="border border-gray-300 p-2">50</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Sky 100</td>
              <td className="border border-gray-300 p-2">100</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Sky 250</td>
              <td className="border border-gray-300 p-2">250</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Sky 500</td>
              <td className="border border-gray-300 p-2">500</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2">Sky Major</td>
              <td className="border border-gray-300 p-2">1000</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    title: "Tournament Approval Criteria",
    icon: CheckCircle,
    content: (
      <>
        <p className="mb-4">For a tournament to award ranking points, it must meet the following criteria:</p>
        <ul className="list-disc list-inside mb-4">
          <li>Approved by SkyBall™</li>
          <li>Open to the general public</li>
          <li>Available for public signup at least 24 hours prior to the registration deadline</li>
        </ul>
        <p>SkyBall™ reserves the right to organize additional invite-only events that contribute to rankings.</p>
      </>
    ),
  },
  {
    title: "Ranking Calculation",
    icon: Star,
    content: (
      <ul className="list-disc list-inside mb-4">
        <li>A player&apos;s ranking is based on their top 10 tournament performances over a rolling 12-month period.</li>
        <li>After 12 months: Points expire completely</li>
        <li>
          Protected Ranking: If a player is injured for 6+ months, their ranking is &quot;frozen&quot; for up to 1 year to allow
          fair return.
        </li>
        <li>
          Player must submit evidence of injury to SkyBall™. SkyBall™ retains sole right to determine if injury
          qualifies player for a Protected Ranking
        </li>
      </ul>
    ),
  },
  {
    title: "Qualification Criteria for Larger Events",
    icon: Calendar,
    content: (
      <ul className="list-disc list-inside mb-4">
        <li>Sky Majors: Top ranked players automatically qualify.</li>
        <li>Sky X: Open sign up</li>
      </ul>
    ),
  },
  {
    title: "Tiebreakers",
    icon: Users,
    content: (
      <>
        <p className="mb-2">If players have the same ranking points:</p>
        <ol className="list-decimal list-inside">
          <li>Head-to-head record</li>
          <li>Most tournament wins</li>
          <li>Highest single-tournament point total</li>
          <li>Total matches won in the last 12 months</li>
        </ol>
      </>
    ),
  },
]

export default function RankingsContent() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12">SkyBall™ Rankings</h1>
        <RaceTo300Announcement className="mb-12" />
        

        <div className="max-w-4xl mx-auto space-y-8">
          <RankingsTable />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-sky-600">
                <HelpCircle className="mr-2" />
                About SkyBall™ Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                SkyBall™ rankings are designed to reflect players&apos; performance in official tournaments over time. These
                rankings determine seedings in major tournaments and can qualify players for special events.
                Understanding the ranking system is crucial for competitive SkyBall™ players.
              </p>
            </CardContent>
          </Card>

          {rankingSections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl text-sky-600">
                  <section.icon className="mr-2" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>{section.content}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

