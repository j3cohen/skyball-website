import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/login",
          "/cart",
          "/checkout/",
          "/deck",
          "/api/",
          // The URL itself is the credential on these — a leaked link that
          // got indexed would expose seat claim tokens / a whole purchase.
          "/coaching/purchased",
          "/coaching/claim/",
          "/coaching/course",
          "/coaching/certificate/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
