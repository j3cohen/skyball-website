// app/dashboard/page.tsx
import Navbar     from "@/components/navbar"
import Footer     from "@/components/footer"
import DashboardContent from "@/components/dashboard-content"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Your personal dashboard for managing your SkyBall experience.",
  path: "/dashboard",
  index: false,
})

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
