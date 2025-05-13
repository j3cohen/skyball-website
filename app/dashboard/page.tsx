// app/dashboard/page.tsx
import Navbar     from "@/components/navbar"
import Footer     from "@/components/footer"
import DashboardContent from "@/components/dashboard-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your personal dashboard for managing your SkyBall experience.",
  openGraph: {
    title: "Dashboard",
    description: "Your personal dashboard for managing your SkyBall experience.",
    url: "https://skyball.com/dashboard",
  },
}

export const dynamic    = "force-dynamic"
export const revalidate = 0

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <DashboardContent />
        </div>
      </main>
      <Footer />
    </>
  )
}
