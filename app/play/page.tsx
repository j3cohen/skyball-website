import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { PlayEvents } from "@/components/play-events"

export default function PlayPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Play SkyBall</h1>
          <p className="text-lg text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Join us for tournaments, clinics, open play sessions, and special events. Find the perfect way to experience
            SkyBall!
          </p>

          <PlayEvents />
        </div>
      </main>
      <Footer />
    </>
  )
}
