import Image from "next/image"
import { Award, Calendar, ExternalLink, BookOpen, Trophy } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ContactFormDialog } from "@/components/contact-form-dialog"
import { Card, CardContent } from "@/components/ui/card"

export function AboutSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="space-y-4">
            <div className="inline-block rounded-lg bg-sky-100 px-3 py-1 text-sm text-sky-600">About SkyBall™</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">A New Sport For Everyone</h2>
            <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              At SkyBall™, our mission is to spread the joy of our innovative game to players of all skill levels.
              Founded in 2025, we&apos;ve created SkyBall™ as a fun, engaging way for people to stay active, connect with
              others, and enjoy the thrill of racket sports in a fresh, exciting format.
            </p>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              {/* <Button className="inline-flex h-10 items-center justify-center rounded-md bg-sky-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-950 disabled:pointer-events-none disabled:opacity-50">
                Find a Court
                <MapPin className="ml-2 h-4 w-4" />
              </Button> */}
              <Button
                variant="outline"
                className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                asChild
              >
                <Link href="/partners">Become a Partner</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-[400px] w-full overflow-hidden rounded-xl">
              <Image
                src="https://jbcpublicbucket.s3.us-east-1.amazonaws.com/skyball-action-shots/open-play-1-photo.jpeg"
                alt="Person playing SkyBall"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-4">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Our Mission</h3>
              <p className="mt-2 text-gray-500">
                We&apos;re dedicated to fostering a vibrant SkyBall™ community that welcomes casual players and competitive
                enthusiasts alike. Our goal is to provide multiple ways to engage with SkyBall™ - from friendly matches
                in your backyard to our official circuit, where players can test their skills in a more structured
                environment.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">The Sport</h3>
              <p className="mt-2 text-gray-500">
                Played on a pickleball-sized court (20x44) with tennis-like movement patterns. <em>Rally-ready</em> in
                minutes for beginners, yet offers depth for competitive players. As the home of SkyBall™, we&apos;re
                committed to delivering high-quality equipment that ensures the best possible playing experience.
              </p>
              <div className="mt-4 pt-3 border-t border-gray-200 w-full text-center">
                <Link
                  href="/rules"
                  className="text-sky-600 hover:text-sky-700 text-sm flex items-center justify-center"
                >
                  <span className="mr-1">View full rules</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Community Events</h3>
              <p className="mt-2 text-gray-500">
                Through our official tournaments, leagues, and open play events, we create exciting opportunities for
                players to challenge themselves, improve their skills, and become part of the growing SkyBall™
                community, while keeping the game approachable and playable for everyone.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 bg-gray-50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-center mb-8">The Benefits of SkyBall™</h3>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="text-xl font-semibold mb-3 text-sky-600">Tennis-Like Movement, Pickleball-Sized Court</h4>
              <p className="text-gray-600">
                SkyBall™ offers the dynamic movement patterns and strategic depth of tennis, but on a more accessible
                pickleball-sized court (20x44). This creates an engaging experience that feels familiar to tennis
                players while being more approachable for beginners.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="text-xl font-semibold mb-3 text-sky-600">Shorter, More Intense Games</h4>
              <p className="text-gray-600">
                With a streamlined scoring system and faster gameplay, SkyBall™ matches are shorter and more intense
                than traditional tennis. This means more action, less waiting, and the ability to play multiple games in
                a single session.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="text-xl font-semibold mb-3 text-sky-600">Leverages Existing Infrastructure</h4>
              <p className="text-gray-600">
                By utilizing the growing number of pickleball courts nationwide, SkyBall™ makes efficient use of
                existing facilities. No need to build new courts—just activate the ones already available in your
                community.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="text-xl font-semibold mb-3 text-sky-600">Rally Ready in Minutes</h4>
              <p className="text-gray-600">
                One of SkyBall&apos;s greatest strengths is how quickly new players can start having fun. Unlike many racket
                sports with steep learning curves, SkyBall™ is designed to be &quot;rally ready&quot; - most people can enjoy
                rallying within just a few minutes of picking up a racket, making it perfect for casual play and social
                gatherings.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="text-xl font-semibold mb-3 text-sky-600">High-Intensity Workout</h4>
              <p className="text-gray-600">
                For competitive players and athletes, SkyBall™ delivers an exceptional full-body workout. The dynamic
                movement patterns and quick reflexes required create an intense cardio session that builds agility,
                coordination, and endurance while being genuinely fun and engaging.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">What We Offer</h3>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 max-w-4xl mx-auto">
            <Link
              href="/rankings"
              className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-3 group-hover:bg-sky-200">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-sky-600 transition-colors">Rankings</h4>
              <p className="text-sm text-gray-500">Track player progress and standings</p>
            </Link>

            <Link
              href="/rules"
              className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-3 group-hover:bg-sky-200">
                <BookOpen className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-sky-600 transition-colors">Rules</h4>
              <p className="text-sm text-gray-500">Official SkyBall™ rulebook</p>
            </Link>

            <Link
              href="/shop"
              className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-3 group-hover:bg-sky-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-shopping-bag"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-sky-600 transition-colors">Gear</h4>
              <p className="text-sm text-gray-500">High-quality equipment</p>
            </Link>

            <Link
              href="/play"
              className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-3 group-hover:bg-sky-200">
                <Trophy className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-sky-600 transition-colors">
                Tournaments
              </h4>
              <p className="text-sm text-gray-500">Competitions for all levels</p>
            </Link>

            <Link
              href="/play"
              className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-3 group-hover:bg-sky-200">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-sky-600 transition-colors">Open Play</h4>
              <p className="text-sm text-gray-500">Community events for everyone</p>
            </Link>
          </div>
        </div>

        <div className="mt-16 border-t pt-16">
          <h3 className="text-2xl font-bold text-center mb-8">How SkyBall™ Compares</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 text-left font-medium">Feature</th>
                  <th className="p-4 text-left font-medium">SkyBall™</th>
                  <th className="p-4 text-left font-medium">Tennis</th>
                  <th className="p-4 text-left font-medium">Pickleball</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-4 font-medium">Court Size</td>
                  <td className="p-4">20&apos; x 44&apos; (Pickleball sized)</td>
                  <td className="p-4">60&apos; x 120&apos; (Full court)</td>
                  <td className="p-4">20&apos; x 44&apos;</td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="p-4 font-medium">Game Length</td>
                  <td className="p-4">Short, intense matches</td>
                  <td className="p-4">Can last hours</td>
                  <td className="p-4">Medium length</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 font-medium">Movement Style</td>
                  <td className="p-4">Dynamic, tennis-like</td>
                  <td className="p-4">Full court coverage</td>
                  <td className="p-4">More stationary</td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="p-4 font-medium">Learning Curve</td>
                  <td className="p-4">Gentle</td>
                  <td className="p-4">Steep</td>
                  <td className="p-4">Gentle</td>
                </tr>
                <tr className="border-t">
                  <td className="p-4 font-medium">Kitchen Zone</td>
                  <td className="p-4">No kitchen</td>
                  <td className="p-4">No kitchen</td>
                  <td className="p-4">Has kitchen (non-volley zone)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16 text-center bg-gray-50 rounded-xl p-8">
          <h3 className="text-2xl font-bold mb-4">Join the SkyBall™ Movement</h3>
          <p className="text-gray-500 max-w-2xl mx-auto mb-6">
            Whether you&apos;re a seasoned racket sport player or completely new to paddle games, SkyBall™ offers an
            accessible, fun, and engaging experience where the social aspects remain at the heart of everything we do.
          </p>
    
            <ContactFormDialog />

        </div>
      </div>
    </section>
  )
}
