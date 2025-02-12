import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

const guidelines = [
  {
    title: "Respect for All",
    description:
      "Treat all players, officials, and spectators with respect, regardless of their skill level, background, or experience.",
  },
  {
    title: "Fair Play",
    description: "Always play by the rules and demonstrate good sportsmanship, both on and off the court.",
  },
  {
    title: "Inclusive Environment",
    description:
      "Foster an inclusive environment where players of all ages and abilities feel welcome and encouraged to participate.",
  },
  {
    title: "Safety First",
    description:
      "Prioritize the safety of yourself and others. Report any unsafe conditions or behaviors to event organizers or officials.",
  },
  {
    title: "Positive Communication",
    description:
      "Use positive and constructive communication when interacting with other players, coaches, and officials.",
  },
  {
    title: "Care for Facilities",
    description:
      "Respect and take care of the facilities and equipment you use. Leave the court and surrounding areas clean after play.",
  },
]

export default function CommunityGuidelinesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">Community Guidelines</h1>
          <p className="text-center mb-12 max-w-2xl mx-auto">
            Our SkyBall community is built on mutual respect, fair play, and a love for the game. Follow these
            guidelines to ensure a positive experience for everyone involved.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {guidelines.map((guideline, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-2">{guideline.title}</h2>
                <p className="text-gray-600">{guideline.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

