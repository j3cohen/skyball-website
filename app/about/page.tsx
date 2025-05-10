import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AboutSection } from "@/components/about-section"


export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <AboutSection/>
      </main>
      <Footer />
    </>
  )
}

