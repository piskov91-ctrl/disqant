import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Disqant",
  description:
    "Terms & Conditions governing use of the Disqant virtual try-on SaaS platform, including acceptable use, liability, and UK law.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-3xl px-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
              Legal
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-4 text-sm text-zinc-500">
              Last updated: 26 April 2026 &middot; Governing law: England and Wales.
            </p>
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto max-w-3xl space-y-10 px-6 text-sm leading-relaxed text-zinc-600 md:text-base">
            <p className="text-zinc-700">
              These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the websites, applications, APIs,
              and virtual try-on services made available by Disqant at{" "}
              <span className="text-zinc-900">https://disqant.com</span> (the &quot;Service&quot;). By accessing or using
              the Service, you agree to these Terms. If you are accepting on behalf of a company or other legal entity,
              you represent that you have authority to bind that entity.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">1. The Service</h2>
              <p className="mt-3">
                Disqant provides cloud software that enables retailers to offer AI-assisted virtual try-on to shoppers. We
                may modify, suspend, or discontinue features with reasonable notice where practicable, or immediately if
                needed for security, legal compliance, or to protect the Service. We are based in the United Kingdom and
                provide the Service for business and professional use unless otherwise agreed in writing.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">2. Accounts and eligibility</h2>
              <p className="mt-3">
                You must provide accurate registration information, keep credentials confidential, and notify us of
                unauthorised use. You are responsible for all activity under your account. We may refuse registration
                or suspend accounts for breach of these Terms, risk to the Service, or legal or regulatory reasons.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">3. Subscriptions, trials, and fees</h2>
              <p className="mt-3">
                Paid plans, usage limits, and fees are as shown at checkout, in an order form, or in the admin console. Unless
                stated otherwise, fees are billed in the currency and cycle agreed (e.g. monthly or annual), are
                non-cancellable for the current term except as required by law, and are exclusive of VAT or other
                applicable taxes, which you are responsible for where applicable. We may offer fair-use, free tiers, or
                trials; we may end or change free allocations with notice. Failure to pay may result in suspension of the
                Service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">4. Your content and data</h2>
              <p className="mt-3">
                You (and, where you embed our Service, your end users) may upload images, product data, and other
                materials (&quot;Customer Content&quot;). You grant us a worldwide, non-exclusive licence to host, process,
                transmit, and display Customer Content only as needed to provide and secure the Service and as described
                in your agreement and our Privacy &amp; Cookies policy. You are responsible for obtaining all rights and consents
                for Customer Content, including for virtual try-on of identifiable individuals where required. You
                represent that you have the right to use such content and that it does not violate law or third-party
                rights.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">5. Acceptable use</h2>
              <p className="mt-3">You must not, and must not allow others to:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-1">
                <li>Use the Service in violation of law, including privacy, consumer, or intellectual property law;</li>
                <li>Attempt to gain unauthorised access to systems, data, or accounts;</li>
                <li>Reverse engineer, scrape, or use the Service to build a competitive product, except to the extent
                  permitted by mandatory law;</li>
                <li>Send malware, spam, or excessive automated requests that degrade the Service;</li>
                <li>Upload unlawful, harmful, or non-consensual intimate imagery, or use try-on in ways that harass or
                  target individuals;</li>
                <li>Remove or alter proprietary notices, or resell the Service without authorisation.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">6. Intellectual property</h2>
              <p className="mt-3">
                All Disquant technology and branding are proprietary to Disquant Ltd, including without limitation
                software, APIs, models, algorithms, documentation, user interfaces, and the Disquant name, logos, trade
                dress, domain names, and related marks (whether registered or unregistered). The Service, including
                these elements and any other materials we provide, is owned by Disqant or our licensors. Except for the
                rights expressly granted in these Terms, we reserve all rights. You may not use our name or logo except
                as required for normal attribution in integrations we permit, or with our prior written consent.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">7. Third-party services</h2>
              <p className="mt-3">
                The Service may integrate with third-party platforms (e.g. e-commerce, hosting). Those services are
                subject to the third party&rsquo;s terms; we are not responsible for them.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">8. Warranties</h2>
              <p className="mt-3">
                To the maximum extent permitted by UK law, the Service is provided &quot;as is&quot; and &quot;as
                available&quot;. We do not warrant that the Service will be error-free, uninterrupted, or that virtual
                try-on results will match real-world fit or appearance. We disclaim all implied warranties, including
                satisfactory quality, fitness for a particular purpose, and non-infringement, except that nothing in
                these Terms limits liability for death or personal injury caused by negligence, fraud, or any other
                liability that cannot be excluded by law.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">9. Limitation of liability</h2>
              <p className="mt-3">
                Subject to the previous section, to the maximum extent permitted by law: (a) our total liability arising
                out of or in connection with these Terms or the Service in any twelve-month period is limited to the
                fees you paid to Disqant for the Service in that period (or, if the claim relates to a free or trial
                plan, to fifty British pounds); and (b) we are not liable for any indirect, consequential, or punitive
                damages, or loss of profit, data, or goodwill, even if advised of the possibility. These limits do not
                apply to liability that cannot be limited under applicable law.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">10. Indemnity</h2>
              <p className="mt-3">
                You will defend and indemnify Disqant, our affiliates, and personnel against third-party claims, damages,
                and costs (including reasonable legal fees) arising from Customer Content, your use of the Service in
                breach of these Terms, or your failure to meet applicable law (including data protection) where you are
                responsible.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">11. Term and suspension</h2>
              <p className="mt-3">
                These Terms continue until your subscription or access ends. Either party may terminate for material
                breach that is not cured within thirty days of written notice (or immediately for serious breaches
                including payment, security, or law). We may suspend access if needed to protect the Service or to comply
                with law. Provisions that by their nature should survive (fees, liability, indemnity, governing law) will
                survive.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">12. Privacy and security</h2>
              <p className="mt-3">
                Our collection and use of personal data is described in the{" "}
                <a
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                  href="/privacy"
                >
                  Privacy &amp; Cookies
                </a>
                . Where we process personal data on your instructions as a processor, a separate data processing
                agreement or terms may apply. You are responsible for your own security practices in connection with
                embeds, keys, and staff access.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">13. Governing law and disputes</h2>
              <p className="mt-3">
                These Terms are governed by the law of England and Wales. The courts of England and Wales have exclusive
                jurisdiction, except that you may have mandatory rights in your country of residence that we cannot
                override.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">14. General</h2>
              <p className="mt-3">
                If a provision is unenforceable, the remainder stays in effect. We may assign these Terms in connection
                with a merger, acquisition, or sale of assets, with notice where required. Notices to you may be by email
                or through the Service. The English language version prevails if there is a conflict with translations.
                These Terms, together with any order form or DPA, are the entire agreement for the Service and supersede
                prior agreements on the same subject. No failure to enforce a right is a waiver. Force majeure: neither
                party is liable for events beyond reasonable control, including network failures not caused by the
                affected party, war, or natural events.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900">15. Contact</h2>
              <p className="mt-3">
                For questions about these Terms &amp; Conditions, contact{" "}
                <a
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                  href="mailto:legal@disqant.com"
                >
                  legal@disqant.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
