import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Cookies — Fit Room",
  description:
    "How Fit Room collects, uses, and protects personal data for its UK virtual try-on SaaS, including GDPR rights and cookies.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-3xl px-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
              Legal
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Privacy &amp; Cookies
            </h1>
            <p className="mt-4 text-sm text-zinc-500">
              Last updated: 26 April 2026 &middot; Fit Room is operated from the United Kingdom.
            </p>
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto max-w-3xl space-y-10 px-6 text-sm leading-relaxed text-zinc-600 md:text-base">
            <p className="text-zinc-700">
              This Privacy &amp; Cookies policy explains how Fit Room (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) processes personal
              data when you use our websites, applications, and virtual try-on services at{" "}
              <span className="text-zinc-900">https://fit-room.com</span> (together, the &quot;Service&quot;). It applies
              to visitors, business customers, and their end users where we act as a processor on behalf of a retailer. We
              process personal data in line with the UK General Data Protection Regulation (UK GDPR) and the Data Protection
              Act 2018.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">1. Data controller and contact</h2>
              <p className="mt-3">
                The data controller for personal data we collect in connection with the Service is the Fit Room entity
                named in your order, contract, or sign-up (UK). For questions about this policy or your personal data,
                contact us at{" "}
                <a
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                  href="mailto:privacy@fit-room.com"
                >
                  privacy@fit-room.com
                </a>
                . You can also write to the postal address provided on your agreement or on our website. We are not
                required to appoint a Data Protection Officer for all cases; if we designate one, their details will
                appear here and in our Contact page.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">2. What personal data we collect</h2>
              <p className="mt-3">Depending on how you use the Service, we may process:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
                <li>
                  <span className="text-zinc-900">Account and contact data</span> — name, work email, company name, role,
                  billing and shipping address, phone number, and similar details you or your organisation provide.
                </li>
                <li>
                  <span className="text-zinc-900">Authentication and security data</span> — login identifiers, security
                  tokens, session and device metadata used to keep accounts secure and prevent abuse.
                </li>
                <li>
                  <span className="text-zinc-900">Service and product usage data</span> — feature usage, API calls,
                  configuration, error logs, performance metrics, and support tickets.
                </li>
                <li>
                  <span className="text-zinc-900">Images and media for virtual try-on</span> — where enabled, photos,
                  short video, or other uploads that shoppers or your staff provide so our models can render try-on
                  results. This may include images of a person&rsquo;s body or face for fitting visualisation. We
                  process such media only to deliver the try-on feature and as described in your agreement or embed
                  settings.
                </li>
                <li>
                  <span className="text-zinc-900">Cookies and similar technologies</span> — see section 5.
                </li>
                <li>
                  <span className="text-zinc-900">Correspondence</span> — content of emails, chat, or calls with us, and
                  marketing preferences.
                </li>
              </ul>
              <p className="mt-3">
                If you are a retail customer&rsquo;s end user, the retailer (our customer) is often the controller of
                your personal data, and we process it as a{" "}
                <span className="text-zinc-900">processor</span> under their instructions. The retailer&rsquo;s privacy
                notice will also apply. Where we are the controller, this policy applies in full.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">3. How and why we use your data (lawful bases)</h2>
              <p className="mt-3">We use personal data for the following purposes, based on the lawful basis stated:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
                <li>
                  <span className="text-zinc-900">To provide, secure, and improve the Service</span> — performance of a
                  contract, steps prior to a contract, or legitimate interests in operating a reliable B2B SaaS platform
                  and virtual try-on product.
                </li>
                <li>
                  <span className="text-zinc-900">Billing, accounting, and administration</span> — contract and legal
                  obligation (including tax).
                </li>
                <li>
                  <span className="text-zinc-900">Customer support and communications</span> — contract and legitimate
                  interests.
                </li>
                <li>
                  <span className="text-zinc-900">Analytics, product research, and security monitoring</span> —
                  legitimate interests, or consent where we rely on non-essential cookies (see below).
                </li>
                <li>
                  <span className="text-zinc-900">To comply with law</span> — legal obligation (e.g. requests from
                  competent authorities where valid).
                </li>
                <li>
                  <span className="text-zinc-900">Direct marketing to business contacts</span> — legitimate interests
                  and/or consent, depending on channel and your preferences. You can opt out of marketing at any time.
                </li>
              </ul>
              <p className="mt-3">
                Some image processing for virtual try-on may involve special category or sensitive data in certain
                contexts. Where that applies, we rely on the explicit instructions of the retailer (where they are
                controller), appropriate contractual safeguards, and/or appropriate lawful bases and safeguards under UK
                GDPR, including your explicit consent where we ask for it in the product flow.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">4. Recipients, processors, and international transfers</h2>
              <p className="mt-3">
                We share personal data with trusted service providers (hosting, email delivery, support tooling, security,
                payments, and analytics) who process data on our instructions under written agreements. Some providers may
                be located outside the United Kingdom. When we transfer personal data to countries not covered by a UK
                adequacy decision, we use appropriate safeguards such as the UK International Data Transfer Agreement or
                Addendum (IDTA) and supplementary measures as needed.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">5. Cookies and similar technologies</h2>
              <p className="mt-3">We use cookies and similar technologies to:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
                <li>
                  <span className="text-zinc-900">Strictly necessary</span> — remember sessions, load balancing, security
                  (e.g. CSRF protection), and your cookie choices. These are required for the site to work.
                </li>
                <li>
                  <span className="text-zinc-900">Functional</span> — remember preferences such as language or UI settings.
                </li>
                <li>
                  <span className="text-zinc-900">Analytics</span> — understand how the Service is used so we can improve
                  it. Where required by law, we will only set non-essential cookies after you consent through our
                  cookie banner or settings.
                </li>
                <li>
                  <span className="text-zinc-900">Personalisation and marketing</span> — if we use them, we will only
                  activate them with your consent where the Privacy and Electronic Communications Regulations (PECR) and
                  UK GDPR require it.
                </li>
              </ul>
              <p className="mt-3">
                You can change cookie choices via the link or banner on our site. Browser settings can also block cookies,
                but some features may not work correctly.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">6. Data retention</h2>
              <p className="mt-3">
                We keep personal data only for as long as needed for the purposes above, including legal, accounting, and
                dispute resolution. Image and media used for a try-on may be held only for a short period required to
                generate results, or longer if the retailer&rsquo;s settings or the contract require it—subject to
                review and minimum retention. When retention ends, we delete or irreversibly anonymise data, unless
                a longer period is required by law.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">7. Security</h2>
              <p className="mt-3">
                We use technical and organisational measures appropriate to the risk, such as access controls, encryption
                in transit, monitoring, and staff training. No method of transmission or storage is 100% secure; we
                encourage strong passwords and device security on your side.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">8. Your rights under UK GDPR</h2>
              <p className="mt-3">You may have the right to:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
                <li>Request access to your personal data;</li>
                <li>Request rectification of inaccurate data;</li>
                <li>Request erasure, restriction, or object to processing in certain cases;</li>
                <li>Data portability, where applicable;</li>
                <li>Withdraw consent for processing where we rely on consent, without affecting earlier lawful processing;</li>
                <li>Object to direct marketing (always);</li>
                <li>Not be subject to solely automated decisions with legal or similarly significant effects, where the UK
                  GDPR applies.</li>
              </ul>
              <p className="mt-3">
                To exercise your rights, contact{" "}
                <a
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                  href="mailto:privacy@fit-room.com"
                >
                  privacy@fit-room.com
                </a>
                . If you are an end user of a retailer&rsquo;s site, you may also contact the retailer, who is often your
                main point of contact.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">9. Supervisory authority</h2>
              <p className="mt-3">
                If you are in the UK and have concerns that we have not resolved, you can complain to the Information
                Commissioner&rsquo;s Office (ICO):{" "}
                <a
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                  href="https://ico.org.uk/make-a-complaint/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ico.org.uk
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">10. Children</h2>
              <p className="mt-3">
                The Service is directed at businesses and adults. We do not intentionally collect personal data from
                children under 14 (or the digital consent age in your market) for profile-building. Try-on features on
                retailer sites are controlled by the retailer&rsquo;s own rules.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">11. Changes to this policy</h2>
              <p className="mt-3">
                We may update this Privacy &amp; Cookies policy from time to time. The &quot;Last updated&quot; date at the top will
                change, and we will take further steps (such as email or a notice in the app) for material changes
                where appropriate.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
