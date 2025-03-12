import { upcomingTournaments } from "@/data/tournaments"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

export default function TournamentRegistrationPage({ params }: { params: { id: string } }) {
  const tournament = upcomingTournaments.find((t) => t.id === params.id)

  if (!tournament) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">Register for {tournament.name}</h1>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input type="text" id="name" name="name" required className="mt-1" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input type="email" id="email" name="email" required className="mt-1" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <Input type="tel" id="phone" name="phone" required className="mt-1" />
                
                <Input type="tel" id="phone" name="phone" required className="mt-1" />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <Input type="date" id="dob" name="dob" required className="mt-1" />
              </div>
              {/* <div>
                <label htmlFor="skill_level" className="block text-sm font-medium text-gray-700">
                  Skill Level
                </label>
                <select
                  id="skill_level"
                  name="skill_level"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                >
                  <option value="">Select your skill level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="pro">Professional</option>
                </select>
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Fee: {tournament.registrationFee}
                </label>
                <p className="text-sm text-gray-500">Payment will be collected at the tournament check-in.</p>
              </div>
              <div>
                <Button type="submit" className="w-full">
                  Register for Tournament
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

