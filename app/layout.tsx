import { libreFranklin, jetbrainsMono, poppins } from "./fonts"
import "./globals.css"
import type { Metadata } from "next"
import type React from "react"
import { Analytics } from "@vercel/analytics/react"
import ScrollToTop from "@/components/scroll-to-top"

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
        <ScrollToTop />
        {children} 
        <Analytics /> 
      </body>
    </html>
  )
}

