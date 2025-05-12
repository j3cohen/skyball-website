import { libreFranklin, jetbrainsMono, poppins } from "./fonts"
import "./globals.css"
import type { Metadata } from "next"
import type React from "react"
import { Analytics } from "@vercel/analytics/react"
import ScrollToTop from "@/components/scroll-to-top"
import { Suspense } from "react"
import SupabaseProvider from "@/components/supabase-provider"
import { SpeedInsights } from "@vercel/speed-insights/next"


export const metadata: Metadata = {
  title: "SkyBall - Rally Ready",
  description: "The exciting new sport combining the best of tennis and pickleball",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${libreFranklin.variable} ${jetbrainsMono.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
        <Analytics /> 
        <SpeedInsights/>
      </body>
    </html>
  )
}

