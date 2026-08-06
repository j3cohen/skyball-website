// app/coaching/page.tsx
// Public sales page for the coaching certification: program overview,
// curriculum outline, and purchasable offers. Content comes from the
// published cert_programs row (service-role read — the cert tables are
// deny-all and this is a server component).

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import OfferPurchase, { type SalesOffer } from "@/components/certification/offer-purchase";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "SkyBall Coaching Certification",
  description:
    "Become a certified SkyBall coach: a self-paced video course with section quizzes and an official certificate. Individual seats and club packs available.",
  path: "/coaching",
});

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
};

export default async function CoachingPage() {
  const { data: programs } = await supabaseAdmin
    .from("cert_programs")
    .select("id, title, description")
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(1);

  const program = (programs?.[0] ?? null) as ProgramRow | null;

  let sections: { id: string; title: string }[] = [];
  let offers: SalesOffer[] = [];

  if (program) {
    const [{ data: secData }, { data: offerData }] = await Promise.all([
      supabaseAdmin
        .from("cert_sections")
        .select("id, title, position")
        .eq("program_id", program.id)
        .order("position", { ascending: true }),
      supabaseAdmin
        .from("cert_offers")
        .select("id, name, description, price_cents, seat_count, equipment_items, position")
        .eq("program_id", program.id)
        .eq("active", true)
        .order("position", { ascending: true }),
    ]);
    sections = (secData ?? []) as { id: string; title: string }[];
    offers = ((offerData ?? []) as {
      id: string;
      name: string;
      description: string | null;
      price_cents: number;
      seat_count: number;
      equipment_items: { label: string; qty: number }[];
    }[]).map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      priceCents: o.price_cents,
      seatCount: o.seat_count,
      equipmentItems: Array.isArray(o.equipment_items) ? o.equipment_items : [],
    }));
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Hero */}
        <section className="bg-gray-900 py-24 text-white">
          <div className="container mx-auto px-4 max-w-4xl pt-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
              SkyBall Coaching
            </p>
            <h1 className="mt-2 text-4xl md:text-5xl font-bold">
              {program?.title ?? "SkyBall Coaching Certification"}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-300">
              {program?.description ??
                "Become a certified SkyBall coach with our self-paced video course. Watch, learn, pass the quizzes, and earn your official certificate."}
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-4xl py-12">
          {!program ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Certification enrollment opens soon
              </h2>
              <p className="mt-2 text-gray-600">
                We&apos;re putting the finishing touches on the program. Check back shortly.
              </p>
            </div>
          ) : (
            <>
              {/* How it works */}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["1. Watch", "Short video lessons for each section, at your own pace."],
                  ["2. Pass", "A quick quiz after each section — instant results as you go."],
                  ["3. Get certified", "Print, save, or share your official SkyBall coaching certificate."],
                ].map(([t, d]) => (
                  <div key={t} className="bg-white rounded-xl shadow p-5">
                    <p className="font-semibold text-gray-900">{t}</p>
                    <p className="mt-1 text-sm text-gray-600">{d}</p>
                  </div>
                ))}
              </div>

              {/* Curriculum */}
              {sections.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-2xl font-bold text-gray-900">What you&apos;ll learn</h2>
                  <ol className="mt-4 space-y-2">
                    {sections.map((s, i) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 bg-white rounded-lg shadow-sm px-4 py-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-900">{s.title}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Offers */}
              <div className="mt-10">
                <h2 className="text-2xl font-bold text-gray-900">Get certified</h2>
                <p className="mt-1 text-gray-600">
                  Buying for a club or team? Multi-seat packs give each coach their own
                  certification seat — you&apos;ll receive a private link for every seat after
                  checkout.
                </p>
                <div className="mt-5">
                  {offers.length > 0 ? (
                    <OfferPurchase offers={offers} />
                  ) : (
                    <p className="text-gray-600">Purchasing opens shortly — check back soon.</p>
                  )}
                </div>
              </div>

              {/* Already purchased */}
              <div className="mt-12 rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-600">
                  Already have a seat link? Open it to claim your seat. Already enrolled?{" "}
                  <a href="/coaching/course" className="font-medium text-primary underline">
                    Continue your course →
                  </a>
                </p>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
