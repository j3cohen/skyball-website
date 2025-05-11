import { Award, MapPin, Users, Calendar } from "lucide-react"
import Link from "next/link"


import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ContactFormDialog } from "@/components/contact-form-dialog"

export default function PartnersPage() {
  return (
    <>
    <Navbar/>
        <section className="py-24 bg-white">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto">
            <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Partnership Opportunities</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Join us in growing SkyBall™ globally. We&apos;re committed to being a high-quality partner that brings fun,
                enjoyment, and lifestyle benefits to communities. Partner with us to create accessible, social, and
                energizing experiences through sport.
            </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 mb-16">
            <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mr-3">
                    <Users className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Officials</h2>
                </div>
                <p className="text-gray-600">
                Join our network of certified referees for tournaments and league play. We provide training,
                certification, and ongoing support to ensure high-quality officiating at all SkyBall™ events.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mr-3">
                    <Award className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Coaches & Instructors</h2>
                </div>
                <p className="text-gray-600">
                Help teach the next generation of SkyBall™ players with our support. We offer coaching resources,
                certification programs, and marketing support to help you build your SkyBall™ coaching business.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mr-3">
                    <MapPin className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Venues</h2>
                </div>
                <p className="text-gray-600">
                Transform your pickleball courts into thriving SkyBall™ destinations. We work closely with
                membership-based facilities to host events for members and develop ongoing programs that increase facility
                utilization and member satisfaction.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mr-3">
                    <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Businesses</h2>
                </div>
                <p className="text-gray-600">
                We partner with breweries, coffee shops, and other local businesses to create complete social experiences
                around our events through in-kind sponsorships. Increase foot traffic and build community connections
                through SkyBall™ events.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 md:col-span-2">
                <div className="flex items-center mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mr-3">
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
                    className="lucide lucide-package"
                    >
                    <path d="m7.5 4.27 9 5.15" />
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold">Distributors</h2>
                </div>
                <p className="text-gray-600">
                Partner with us to bring{" "}
                <Link href="/shop" className="text-sky-600 hover:underline">
                    official SkyBall™ gear
                </Link>{" "}
                to new markets with our quality standards. We offer competitive wholesale pricing, marketing support, and
                exclusive territory rights for qualified distributors.
                </p>
            </div>
            </div>

            <div className="text-center mt-12 bg-gray-50 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Partner with SkyBall™?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                We&apos;re excited to explore partnership opportunities with you. Contact us today to discuss how we can work
                together to grow SkyBall™ in your community.
            </p>
            <ContactFormDialog/>
            </div>
        </div>
        </section>
    <Footer/>
    </>
  )
}
