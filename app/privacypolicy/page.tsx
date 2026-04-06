import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — SkyBall™",
  description: "SkyBall™ Privacy Policy: how we collect, use, and protect your personal information on our website and mobile app.",
  alternates: { canonical: "https://skyball.us/privacypolicy" },
  openGraph: {
    title: "Privacy Policy — SkyBall™",
    description: "SkyBall™ Privacy Policy: how we collect, use, and protect your personal information on our website and mobile app.",
    url: "https://skyball.us/privacypolicy",
  },
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-2 text-center">Privacy Policy</h1>
          <p className="text-center text-gray-500 mb-10">Effective Date: April 6, 2026</p>

          <div className="bg-white rounded-xl shadow-sm p-8 space-y-8 text-gray-700">

            <section>
              <p>
                JBC Ventures LLC, operating as SkyBall™ (&quot;SkyBall,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), operates the website{" "}
                <a href="https://skyball.us" className="text-sky-600 underline">skyball.us</a> and the SkyBall mobile
                application (collectively, the &quot;Services&quot;). This Privacy Policy explains how we collect, use,
                disclose, and protect information about you when you use our Services. By using the Services, you agree
                to the practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-1">Information you provide directly</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Account registration:</strong> name, email address, and password when you create an account.</li>
                    <li><strong>Purchases:</strong> name, email address, shipping address, and phone number when you place an order. Payment card details are processed directly by Stripe and are never stored on our servers.</li>
                    <li><strong>Contact forms &amp; communications:</strong> any information you submit when contacting us, such as your name, email address, and message content.</li>
                    <li><strong>Tournament &amp; event registration:</strong> name, contact information, and any other details you provide when registering for SkyBall events.</li>
                    <li><strong>Optional survey responses:</strong> how you heard about us and order notes, collected at checkout.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Information collected automatically</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Usage data:</strong> pages visited, links clicked, and general navigation patterns, collected via Google Analytics (GA4).</li>
                    <li><strong>Device &amp; log data:</strong> IP address, browser type, operating system, referring URLs, and timestamps.</li>
                    <li><strong>Cookies and similar technologies:</strong> we use cookies to maintain your session and remember your cart. Analytics cookies are used to understand how visitors use our site.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1">Information from third parties</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Stripe:</strong> we receive confirmation of payment success or failure. We do not receive or store full payment card numbers.</li>
                    <li><strong>Supabase (authentication):</strong> if you sign in via a third-party provider, we may receive your name and email address from that provider.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Process and fulfill your orders, including communicating shipping and tracking information.</li>
                <li>Create and manage your account.</li>
                <li>Respond to your questions, support requests, and feedback.</li>
                <li>Send transactional emails (order confirmations, shipping notifications). We do not send marketing emails without your consent.</li>
                <li>Register you for tournaments or events you sign up for.</li>
                <li>Analyze usage trends to improve the Services.</li>
                <li>Detect and prevent fraud or unauthorized activity.</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Share Your Information</h2>
              <p className="mb-3">We do not sell your personal information. We may share your information in the following limited circumstances:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Service providers:</strong> we share information with trusted vendors who help us operate the Services, including Stripe (payments), Supabase (database and authentication), Vercel (hosting), and shipping carriers. These parties are contractually obligated to protect your information and may only use it to perform services on our behalf.</li>
                <li><strong>Analytics:</strong> we use Google Analytics to collect aggregated, anonymized usage data. Google&apos;s use of this data is governed by{" "}
                  <a href="https://policies.google.com/privacy" className="text-sky-600 underline" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
                </li>
                <li><strong>Growth and sport development partners:</strong> we may share your name, email address, and other information you voluntarily provide with select partners working to grow the sport of SkyBall — such as the United States Tennis Association (USTA), tennis clubs, recreational sports organizations, and similar entities. We will only share your information with partners whose purposes are aligned with the SkyBall community. You may opt out of this sharing at any time by emailing{" "}
                  <a href="mailto:info@skyball.us" className="text-sky-600 underline">info@skyball.us</a>.
                </li>
                <li><strong>Legal requirements:</strong> we may disclose your information if required by law, subpoena, or other legal process, or if we believe disclosure is necessary to protect our rights or the safety of others.</li>
                <li><strong>Business transfers:</strong> if JBC Ventures LLC is acquired by or merges with another company, your information may be transferred as part of that transaction. We will notify you before your information is transferred and becomes subject to a different privacy policy.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide the Services,
                fulfill transactions, resolve disputes, and comply with legal obligations. Order records are retained for a
                minimum of seven (7) years for tax and accounting purposes. You may request deletion of your account and
                associated personal data at any time (see Section 7).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
              <p>
                We implement industry-standard safeguards to protect your personal information, including encrypted
                transmission (HTTPS/TLS), access controls, and secure cloud infrastructure. Payment data is handled
                exclusively by Stripe, which is PCI DSS compliant. While we take reasonable measures to protect your
                information, no method of transmission over the internet or electronic storage is completely secure, and
                we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Children&apos;s Privacy</h2>
              <p>
                The Services are not directed to children under the age of 13, and we do not knowingly collect personal
                information from children under 13. If we learn that we have collected personal information from a child
                under 13, we will delete it promptly. If you believe we may have collected information from a child under
                13, please contact us at{" "}
                <a href="mailto:info@skyball.us" className="text-sky-600 underline">info@skyball.us</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Your Rights and Choices</h2>
              <p className="mb-3">Depending on your location, you may have the following rights with respect to your personal information:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Access:</strong> request a copy of the personal information we hold about you.</li>
                <li><strong>Correction:</strong> request correction of inaccurate or incomplete information.</li>
                <li><strong>Deletion:</strong> request deletion of your personal information, subject to legal retention requirements.</li>
                <li><strong>Portability:</strong> request a machine-readable copy of your data.</li>
                <li><strong>Opt-out of analytics:</strong> you can opt out of Google Analytics tracking by installing the{" "}
                  <a href="https://tools.google.com/dlpage/gaoptout" className="text-sky-600 underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.
                </li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{" "}
                <a href="mailto:info@skyball.us" className="text-sky-600 underline">info@skyball.us</a>. We will respond
                within 30 days. We may need to verify your identity before processing your request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. California Residents (CCPA/CPRA)</h2>
              <p>
                If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA)
                as amended by the California Privacy Rights Act (CPRA), including the right to know what personal
                information is collected, the right to delete personal information, the right to correct inaccurate
                personal information, and the right to opt out of the sale or sharing of personal information. We do not
                sell or share your personal information as defined under California law. To submit a request, contact us
                at{" "}
                <a href="mailto:info@skyball.us" className="text-sky-600 underline">info@skyball.us</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. International Users</h2>
              <p>
                The Services are operated in the United States. If you are located outside the United States, please be
                aware that your information will be transferred to, stored, and processed in the United States, where
                data protection laws may differ from those in your country. By using the Services, you consent to this
                transfer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Third-Party Links</h2>
              <p>
                The Services may contain links to third-party websites or services. This Privacy Policy does not apply
                to those sites. We encourage you to review the privacy policies of any third-party sites you visit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will revise the &quot;Effective Date&quot;
                at the top of this page. We encourage you to review this policy periodically. Your continued use of the
                Services after any changes constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Contact Us</h2>
              <p>If you have any questions or concerns about this Privacy Policy, please contact us:</p>
              <div className="mt-3 ml-2 space-y-1">
                <p><strong>JBC Ventures LLC (operating as SkyBall™)</strong></p>
                <p>Email: <a href="mailto:info@skyball.us" className="text-sky-600 underline">info@skyball.us</a></p>
                <p>Website: <a href="https://skyball.us" className="text-sky-600 underline">skyball.us</a></p>
              </div>
            </section>

            <section className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Last updated: April 6, 2026</p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
