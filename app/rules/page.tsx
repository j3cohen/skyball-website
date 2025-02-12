import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RulesContent from "@/components/rules-content"

export default function RulesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <RulesContent />
      </main>
      <Footer />
    </>
  )
}

