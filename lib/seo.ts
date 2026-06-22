import type { Metadata } from "next"

// Single source of truth for the site's public domain. To switch domains later
// (e.g. to skyballglobal.com), set NEXT_PUBLIC_SITE_URL in the deployment env —
// no code change required.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skyball.us"

export const OG_IMAGE =
  "https://jbcpublicbucket.s3.us-east-1.amazonaws.com/website-content/SkyBall_Home_Logo.jpg"

type PageMetadataOptions = {
  title: string
  description: string
  /** Path beginning with "/" (e.g. "/faq"). Omit for the homepage. */
  path?: string
  /** Absolute image URL for OG/Twitter. Defaults to the SkyBall logo. */
  image?: string
  /** Set false to mark the page noindex/nofollow. */
  index?: boolean
  /** Optional richer Open Graph / Twitter title. Defaults to `title`. */
  ogTitle?: string
  /** Optional richer Open Graph / Twitter description. Defaults to `description`. */
  ogDescription?: string
}

/**
 * Build a consistent Metadata object: canonical URL, Open Graph, and Twitter card,
 * all anchored to SITE_URL. Use for static pages (`export const metadata = pageMetadata(...)`)
 * and inside `generateMetadata` for dynamic routes.
 */
export function pageMetadata({
  title,
  description,
  path = "",
  image = OG_IMAGE,
  index = true,
  ogTitle,
  ogDescription,
}: PageMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`
  const social = { title: ogTitle ?? title, description: ogDescription ?? description }
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "SkyBall™",
      ...social,
      images: [{ url: image, width: 1200, height: 630, alt: social.title }],
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  }
}
