// app/reset-password/page.tsx
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import ResetPasswordForm from "@/components/reset-password-form"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Reset Password",
  description: "Set a new password for your SkyBall account.",
  path: "/reset-password",
  index: false,
})

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-6">Reset Your Password</h1>
          <ResetPasswordForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
