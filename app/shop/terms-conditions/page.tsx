import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import ShopTermsConditions from "@/components/shop-terms-conditions"
// import TournamentList from "@/components/tournament-list"

export const metadata: Metadata = {
  title: "Shop Terms & Conditions",
  description: "SkyBall™ shop terms and conditions — shipping, returns, refunds, and purchase policies.",
  alternates: { canonical: "https://skyball.us/shop/terms-conditions" },
  openGraph: {
    title: "SkyBall™ Shop Terms & Conditions",
    description: "SkyBall™ shop terms and conditions — shipping, returns, refunds, and purchase policies.",
    url: "https://skyball.us/shop/terms-conditions",
  },
}

export default function TournamentsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">SkyBall™ Shop Terms and Conditions</h1>
          {/* <TournamentList /> */}
          <ShopTermsConditions />
        </div>
      </main>
      <Footer />
    </>
  )
}

