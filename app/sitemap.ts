import type { MetadataRoute } from "next"
import { upcomingTournaments, pastTournaments } from "@/data/tournaments"
import { getSupabasePublic } from "@/lib/server/supabasePublic"

const SITE_URL = "https://skyball.us"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, priority: 1.0, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${SITE_URL}/shop`, priority: 0.9, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${SITE_URL}/tournaments`, priority: 0.9, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${SITE_URL}/play`, priority: 0.8, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${SITE_URL}/rules`, priority: 0.8, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/how-to`, priority: 0.8, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/rankings`, priority: 0.7, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${SITE_URL}/faq`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/about`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/partners`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/become-a-host`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/skyball-for-schools`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/past-tournaments`, priority: 0.5, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/community-guidelines`, priority: 0.4, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${SITE_URL}/shop/terms-conditions`, priority: 0.3, changeFrequency: "yearly", lastModified: new Date() },
  ]

  const tournamentPages: MetadataRoute.Sitemap = [
    ...upcomingTournaments.map((t) => ({
      url: `${SITE_URL}/tournaments/${t.id}`,
      priority: 0.8 as const,
      changeFrequency: "weekly" as const,
      lastModified: new Date(),
    })),
    ...pastTournaments.map((t) => ({
      url: `${SITE_URL}/past-tournaments/${t.id}`,
      priority: 0.5 as const,
      changeFrequency: "yearly" as const,
      lastModified: new Date(),
    })),
  ]

  const supabase = getSupabasePublic()

  const { data: products } = await supabase
    .from("products")
    .select("slug")
    .eq("active", true)

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    priority: 0.8,
    changeFrequency: "weekly" as const,
    lastModified: new Date(),
  }))

  const { data: players } = await supabase.from("players").select("slug")

  const playerPages: MetadataRoute.Sitemap = (players ?? []).map((p) => ({
    url: `${SITE_URL}/players/${p.slug}`,
    priority: 0.6,
    changeFrequency: "weekly" as const,
    lastModified: new Date(),
  }))

  return [...staticPages, ...tournamentPages, ...productPages, ...playerPages]
}
