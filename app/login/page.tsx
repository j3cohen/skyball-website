// app/login/page.tsx
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import LoginForm from "@/components/login-form"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Sign In",
  description: "Sign in to your SkyBall account.",
  path: "/login",
  index: false,
})

/**
 * Only allow same-site relative paths as the post-login destination —
 * an attacker-supplied `?from=https://evil.tld` must never become a
 * redirect target.
 */
function safeReturnPath(from: string | undefined): string {
  if (!from) return "/"
  if (!from.startsWith("/") || from.startsWith("//")) return "/"
  return from
}

/** The page explains why sign-in is needed, based on where they came from. */
function contextCopy(from: string): { heading: string; sub: string } {
  if (from.startsWith("/coaching/claim")) {
    return {
      heading: "Sign in to claim your seat",
      sub: "Your coaching certification is tied to your SkyBall account, so we know who earned it.",
    }
  }
  if (from.startsWith("/coaching")) {
    return {
      heading: "Sign in to continue your course",
      sub: "Your progress and certificate are saved to your SkyBall account.",
    }
  }
  if (from.startsWith("/dashboard")) {
    return {
      heading: "Sign in to your dashboard",
      sub: "View your registrations, results, and account details.",
    }
  }
  if (from.startsWith("/play") || from.startsWith("/tournaments")) {
    return {
      heading: "Sign in to register",
      sub: "You need to be signed in to register for events.",
    }
  }
  return {
    heading: "Sign in to SkyBall",
    sub: "Access your registrations, courses, and account.",
  }
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string }
}) {
  const from = safeReturnPath(searchParams.from)
  const { heading, sub } = contextCopy(from)

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-3xl md:text-4xl font-bold">{heading}</h1>
            <p className="mt-3 text-gray-600">{sub}</p>
          </div>

          <div className="mt-8">
            <LoginForm from={from} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
