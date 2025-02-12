import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import AboutHero from "@/components/about-hero"
import OurMission from "@/components/our-mission"

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <AboutHero />
        <OurMission />
      </main>
      <Footer />
    </>
  )
}

