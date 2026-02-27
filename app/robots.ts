import type { MetadataRoute } from "next"

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
        ],
      },
    ],
    sitemap: "https://skyball.us/sitemap.xml",
  }
}
