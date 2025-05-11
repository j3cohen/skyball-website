// app/dashboard/page.tsx
import Navbar     from "@/components/navbar"
import Footer     from "@/components/footer"
import DashboardContent from "@/components/dashboard-content"

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
