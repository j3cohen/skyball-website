// app/login/page.tsx
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AuthCompact } from "@/components/auth-compact"
import Link from "next/link"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string }
}) {
  const from = searchParams.from ?? "/"

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-6">Sign In to SkyBall</h1>
          <p className="mb-4">
            You need to be signed in to register for events.
          </p>
          <AuthCompact />

          {from && (
            <p className="mt-6 text-sm text-gray-600">
              After signing in,{" "}
              <Link
                href={from}
                className="underline text-sky-600 hover:text-sky-800"
              >
                go back to what you were doing
              </Link>
              .
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
