// app/layout.tsx
import type { Metadata } from "next"
import type React from "react"
import "./globals.css"
import { libreFranklin, jetbrainsMono, poppins } from "./fonts"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Suspense } from "react"
import ScrollToTop from "@/components/scroll-to-top"
import SupabaseProvider from "@/components/supabase-provider"
import PageViewTracker from "@/components/page-view-tracker"
import AnalyticsWrapper from "@/components/analytics-wrapper"
import { CartProvider } from "@/components/cart-provider"

const SITE_URL = "https://skyball.us" 
const OG_IMAGE =
  "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/SkyBall_Home_Logo.jpg"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SkyBall™ — Rally Ready",
    template: "%s | SkyBall™",
  },
  description:
    "SkyBall™ is a fast, social racket sport that blends the best of tennis and pickleball. Learn the rules, watch highlights, and get started.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "SkyBall™",
    title: "SkyBall™ — Rally Ready",
    description:
      "SkyBall™ is a fast, social racket sport that blends the best of tennis and pickleball. Learn the rules, watch highlights, and get started.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "SkyBall™ — Rally Ready",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SkyBall™ — Rally Ready",
    description:
      "SkyBall™ is a fast, social racket sport that blends the best of tennis and pickleball. Learn the rules, watch highlights, and get started.",
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${jetbrainsMono.variable} ${poppins.variable}`}
    >
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>

        <SupabaseProvider>
          <CartProvider>{children}</CartProvider>
        </SupabaseProvider>

        <Analytics />
        <AnalyticsWrapper />
        <PageViewTracker />
        <SpeedInsights />
      </body>
    </html>
  )
}
