import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BellIcon as Whistle, Ruler, Trophy, Users, AlertTriangle, Info } from "lucide-react"

const rulesSections = [
  {
    title: "Court Dimensions and Equipment",
    icon: Ruler,
    content: [
      "Court Size: 44 feet long and 20 feet wide for doubles (16 feet wide for singles)",
      "Net Height: 34 inches at the center, 36 inches at the sidelines",
      "Racquets: 21-inch stringed racquets (textured or hexagonal strings are prohibited)",
      "Balls: High-density foam balls approved by SkyBall™",
    ],
  },
  {
    title: "Serving Rules",
    icon: Whistle,
    content: [
      "Only one serve attempt is allowed",
      "Serves that touch the net and land in the correct service box are considered lets and must be replayed",
      "Any form of serve is allowed, with players traditionally using an overhead serve",
      "The returner must allow the serve to bounce before hitting it",
    ],
  },
  {
    title: "Scoring System",
    icon: Trophy,
    content: [
      "Games use traditional tennis scoring (0, 15, 30, 40)",
      "At deuce (40-40), a deciding point is played (no advantage)",
      "Sets are played to 4 games, requiring a 2-game advantage to win",
      "At 4-4, a tiebreaker to 5 points is played (win by 2)",
      "Matches are typically best of 3 sets (best of 5 in major tournaments)",
    ],
  },
  {
    title: "Gameplay Regulations",
    icon: Users,
    content: [
      "After the serve, each side must make at least one groundstroke prior to volleying the ball",
      "If a player releases their racquet to make a shot, it counts as long as the racquet doesn't land on the opponent's side",
      "If the ball comes into contact with any part of a player's body during a live point, that player loses the point",
      "Players switch sides after every odd game",
    ],
  },
  {
    title: "Doubles Specific Rules",
    icon: Users,
    content: [
      "One player from each team must remain inside the service line and alleyway until the ball bounces in court",
      "The receiver's partner must be in the box directly opposite the server",
    ],
  },
  {
    title: "Faults",
    icon: AlertTriangle,
    content: [
      "The ball is hit out of bounds",
      "The ball doesn't clear the net",
      "The ball bounces twice before being hit",
      "A player touches the net or enters the opponent's court during play",
    ],
  },
]

export default function RulesContent() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12">SkyBall™ Official Rules</h1>

        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-sky-600">
                <Info className="mr-2" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                SkyBall™ is an exciting sport that combines elements of tennis and pickleball. These official rules
                govern all SkyBall™ matches and tournaments. Players are expected to familiarize themselves with these
                rules to ensure fair and enjoyable gameplay.
              </p>
            </CardContent>
          </Card>

          {rulesSections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl text-sky-600">
                  <section.icon className="mr-2" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {section.content.map((rule, ruleIndex) => (
                    <li key={ruleIndex}>{rule}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

