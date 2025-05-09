import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import dynamic from "next/dynamic"
import { getAllTournaments } from "@/lib/tournaments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// @ts-ignore – we only render this client-side
const BuyPassSection = dynamic(() => import("@/components/buy-pass-section"), {
  ssr: false,
})

export const revalidate = 0

export default async function DashboardPage() {
  const tournaments = await getAllTournaments()

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 space-y-8">
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Your Upcoming Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                {tournaments.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {tournaments.map((t) => (
                      <li key={t.id}>{t.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No upcoming tournaments.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Buy Tournament Passes</CardTitle>
              </CardHeader>
              <CardContent>
                <BuyPassSection />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
