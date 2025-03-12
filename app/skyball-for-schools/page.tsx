import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { BookOpenIcon, UsersIcon, TrophyIcon, HeartIcon } from "lucide-react"

const benefits = [
  {
    icon: BookOpenIcon,
    title: "Easy to Learn",
    description: "Simple rules and equipment make SkyBall accessible for students of all ages and skill levels.",
  },
  {
    icon: UsersIcon,
    title: "Inclusive Sport",
    description:
      "SkyBall promotes teamwork and can be enjoyed by boys and girls together, fostering a more inclusive PE environment.",
  },
  {
    icon: TrophyIcon,
    title: "Skill Development",
    description: "Helps students improve hand-eye coordination, agility, and strategic thinking.",
  },
  {
    icon: HeartIcon,
    title: "Health Benefits",
    description: "Provides an excellent cardiovascular workout and promotes overall fitness among students.",
  },
]

export default function SkyBallForSchoolsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">SkyBall for Schools</h1>
          <p className="text-center mb-12 max-w-2xl mx-auto">
            Introduce the exciting sport of SkyBall to your school! Our program provides everything you need to get
            students engaged and active.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md flex items-start">
                <div className="mr-4">
                  <benefit.icon className="w-8 h-8 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">{benefit.title}</h2>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">What&apos;s Included in the Program</h2>
            <ul className="list-disc pl-6 mb-6">
              <li>SkyBall equipment set (rackets and balls)</li>
              <li>Portable nets for easy setup</li>
              <li>Comprehensive curriculum guide for PE teachers</li>
              <li>Online training resources and videos</li>
              <li>Support for organizing intramural tournaments</li>
            </ul>
            <div className="text-center">
              <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white">
                Request More Information
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

