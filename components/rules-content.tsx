import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BellIcon as Whistle, Ruler, Trophy, Users, AlertTriangle, Info } from 'lucide-react'
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PickleballCourt } from "@/components/pickleball-court"

const rulesSections = [
  {
    title: "Court Dimensions and Equipment",
    icon: Ruler,
    content: [
      "Court Size: 44 feet long and 20 feet wide for singles and doubles",
      // Moved Service Line / Service Box bullets to Serving Rules (see below)
      "Net Height: 34 inches at the center, 36 inches at the sidelines",
      "Racquets: 21-inch stringed racquets (textured or hexagonal strings are prohibited)",
      "Balls: High-density foam balls approved by SkyBall™",
    ],
    footer: (
      <div className="mt-4 pt-3 border-t border-gray-200">
        <Link href="/conversion" className="text-sky-600 hover:text-sky-800 flex items-center">
          <span className="mr-2">→</span> View our interactive court conversion guide
        </Link>
      </div>
    ),
  },
  {
    title: "Serving Rules",
    icon: Whistle,
    content: [
      "Only one serve attempt is allowed",
      "Serves that touch the net and land in the correct service box are considered lets and must be replayed",
      "The returner must allow the serve to bounce before hitting it",
    ],
  },
  {
    title: "Scoring System",
    icon: Trophy,
    content: [
      "Games are played to 11 points (win by 2)",
      "The initial serving player serves one point and then players alternate two serves each",
      "SkyBall Quickplay matches consist of a single game to 11, while tournament play is best of 3, 5, or 7 games.",
    ],
  },
  {
    title: "Gameplay Regulations",
    icon: Users,
    content: [
      "After the serve, the receiving side must make at least one groundstroke prior to volleying the ball",
      "If a player releases their racquet to make a shot, it counts as long as the racquet doesn't land on the opponent's side",
      "If the ball comes into contact with any part of a player's body during a live point, that player loses the point",
      "Players switch sides after every game",
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
      "A serve lands outside the correct service box",
      "A player touches the net or enters the opponent's court during play",
      "Player reaches over the net to hit the ball before it comes to their side",
      "Foot fault: Server steps on or over the baseline before serving the ball",
      "Double hit: The ball is hit twice by the same player in one stroke",
      "Carry: The ball is held on the racquet strings during a stroke",
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
                <ul className="list-disc list-inside space-y-2 mb-6">
                  {section.content.map((rule: string, ruleIndex: number) => (
                    <li key={ruleIndex}>{rule}</li>
                  ))}
                </ul>

                {section.title === "Serving Rules" ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Standard Play
                          <Badge variant="secondary">Any Pickleball Court</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <PickleballCourt showKitchen={true} showServing={true} servingFormat="standard" />
                        <ul className="text-sm space-y-1">
                          <li>• Serve underhand only</li>
                          <li>• Serve crosscourt anywhere in bounds</li>
                          <li>• Entire crosscourt half is valid (including kitchen)</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Service Box Play
                          <Link href="/conversion">
                            <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                              Court Conversion
                            </Badge>
                          </Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <PickleballCourt showServiceBox={true} showServing={true} servingFormat="servicebox" />
                        <ul className="text-sm space-y-1">
                          <li>• Any serve style allowed</li>
                          <li>
                            • Must land in diagonal service box (between service line (12&apos;) and net)
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {"footer" in section && section.footer}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
