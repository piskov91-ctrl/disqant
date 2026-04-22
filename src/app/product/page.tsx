import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";
import {
  Camera,
  Code2,
  Gauge,
  Globe,
  Laptop2,
  Sparkles,
  Upload,
} from "lucide-react";

export default function ProductPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        {/* HERO */}
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              What is Wear Me?
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Wear Me is a virtual try-on widget that helps shoppers see themselves wearing your products—before
              they buy. It&apos;s built for UK online retailers who want an easy integration, fewer returns, and
              more confident checkouts.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600">
              Most fashion purchases still come down to one question: &quot;Will this look right on me?&quot; Wear
              Me answers that question on the product page, in seconds, using AI fashion technology—without sending
              shoppers off to another app or another tab.
            </p>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600">
              That matters because confident shoppers tend to convert more often and return less. Wear Me is
              designed to be a practical upgrade for busy teams: quick to install, easy to understand, and simple
              enough that you can roll it out across your catalogue without turning it into a months-long project.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
                Try Demo
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-full border border-surface-border bg-white px-8 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              The simplest way to add virtual try-on
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              You don&apos;t need a new app, a new checkout, or a big rebuild. You just add the widget, and your
              product pages do the rest.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              The goal is simple: make virtual try-on feel like a normal part of shopping—something shoppers can
              try once, trust quickly, and come back to on the next product. When it feels natural, you get more
              completed try-ons, which usually helps increase conversions.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              Wear Me is also built around retailer realities: you&apos;re juggling margins, returns, customer
              service load, and seasonal drops. So the flow stays lightweight for your team and your shoppers.
            </p>

            <ol className="mt-14 grid gap-6 md:grid-cols-2">
              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Code2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Add one line of code</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Paste the install snippet into your store theme and you&apos;re done. That&apos;s the easy
                    integration.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    Once it&apos;s in place, Wear Me can appear across your product pages without you having to
                    rebuild each template by hand. For most teams, that&apos;s the difference between &quot;we&apos;ll
                    get to it someday&quot; and &quot;it&apos;s live this week&quot;.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    If you&apos;re on Shopify or WooCommerce, it&apos;s usually a theme edit. If you&apos;re on a
                    custom stack, it&apos;s still the same idea: one script tag, one key, and you&apos;re rolling.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Laptop2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Your product pages get a “Wear Me” button
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    It shows up where it matters—right next to your product photos—so shoppers actually use it.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    That matters because the best virtual try-on in the world doesn&apos;t help if shoppers never
                    notice it. Wear Me is intentionally placed where intent is highest: someone is already looking at
                    the item, sizing it up, imagining it on them.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    Keeping shoppers on the PDP also tends to reduce friction in the journey—which is a quiet but
                    real way to help increase conversions.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Camera className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Shoppers use camera or gallery</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Some people prefer a quick camera photo. Others use a saved image. Either way is fine.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    We&apos;ve all watched shoppers bounce off a flow that feels too fussy. Wear Me keeps the upload
                    step straightforward so more people actually finish—and you get more signal about what products
                    shoppers are seriously considering.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    For UK online retailers, mobile behaviour is huge here: people browse on the sofa, screenshot
                    outfits, compare sizes, and buy later. Wear Me fits that habit instead of fighting it.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">They see the try-on in seconds</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Our AI fashion technology creates a realistic preview fast—helping you increase conversions and
                    reduce returns.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    The preview doesn&apos;t need to be perfect to be useful—it needs to be believable enough that a
                    shopper stops guessing. That&apos;s often what nudges someone from &quot;maybe&quot; to
                    &quot;yes&quot;, especially on higher-ticket items where returns sting more.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    And when shoppers feel clearer up front, you tend to see fewer &quot;it looked different on
                    me&quot; returns—which is one of the cleanest ways to reduce returns without changing your
                    product.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* FEATURES */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">Features</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Everything you need to ship try-on
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              These are the practical pieces retailers ask about once they&apos;ve seen virtual try-on work once or
              twice: compatibility, shopper friction, believable previews, and visibility into usage. Wear Me is built
              around those questions—because that&apos;s what actually determines whether it stays on your site.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              Think of it as a small upgrade to your PDP that can have an outsized impact: more confident shoppers,
              cleaner sizing decisions, and less guesswork for your customer service team.
            </p>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Globe className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Works on any website</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Keep your current setup. Wear Me works with Shopify, WooCommerce, and custom stores.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  You shouldn&apos;t have to replatform to experiment with virtual try-on. Most teams want to test it
                  on a handful of categories first—denim, dresses, outerwear—then expand once they like what they see
                  in the numbers.
                </p>
                <p className="mt-3 text-sm text-zinc-600">Wear Me fits that rollout style: easy integration now, room to grow later.</p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Laptop2 className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">No app needed</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Shoppers don&apos;t have to download anything. That means fewer drop-offs and more completed try-ons.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Every extra step is a chance for someone to bounce—especially on mobile. Wear Me keeps people on
                  your site, in your brand experience, moving toward checkout.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  For UK online retailers, that&apos;s a big deal: you&apos;ve already paid for the traffic. Wear Me
                  helps you make more of it count.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Upload className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Camera or gallery</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Let shoppers choose what&apos;s easiest. More try-ons usually means more confident purchases.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Some shoppers already have a full-length photo saved. Others want to snap one quickly in the
                  changing room mirror at home. Wear Me supports both because real life is messy—and your conversion
                  rate shouldn&apos;t depend on everyone behaving the same way.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  More completed uploads usually means better purchase intent—and fewer returns driven by
                  &quot;I couldn&apos;t picture it&quot;.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">AI powered</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  AI fashion technology that helps shoppers feel sure about fit and style—so you can increase
                  conversions.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  The point isn&apos;t to replace your photography—it&apos;s to bridge the gap between your studio
                  shots and how a garment reads on a real person. That&apos;s the moment shoppers usually hesitate.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  When the preview feels credible, shoppers ask better questions (&quot;Which size?&quot; instead of
                  &quot;Will this suit me at all?&quot;), which is a surprisingly practical way to reduce returns.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Gauge className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Usage tracking</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  See usage per client at a glance—so you can manage budgets and spot what&apos;s working.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Virtual try-on isn&apos;t just a shopper feature—it&apos;s also a signal. When certain collections
                  get a lot of try-ons, you learn what people are curious about before they buy.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Clear usage tracking helps you plan promos, buying, and support load without flying blind.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Code2 className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">One line of code</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Quick to launch, easy to maintain. Perfect when you want results without a long project.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  If you&apos;re a small team, you don&apos;t want a roadmap item that drags on for quarters. Wear Me
                  is designed to be the opposite: install, verify on a couple of PDPs, then roll out wider when you&apos;re
                  happy.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  That speed matters because retail moves fast—especially when seasons shift and you need wins on the
                  board quickly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BUILT FOR UK RETAILERS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
              Built for UK retailers
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Built for how UK fashion actually sells online
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              UK fashion ecommerce is a mix of big Shopify stores, WooCommerce independents, specialist sports
              retailers, and independent boutiques doing serious volume with a tiny team. Wear Me is designed for
              that reality: lots of PDP traffic, tight margins, and shoppers who compare options quickly on mobile.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              If you&apos;re on Shopify, you&apos;re usually iterating weekly on merchandising, drops, and campaigns.
              If you&apos;re on WooCommerce, you want flexibility without a fragile custom build. Wear Me stays out of
              your way in both cases—easy integration, then let virtual try-on do the persuasion work on the PDP.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              Independent boutiques win on taste and trust; sports retailers win on fit and function. Wear Me helps
              both by giving shoppers a clearer mental picture before they commit—so you can increase conversions and
              reduce returns without changing what you already sell.
            </p>
          </div>
        </section>

        {/* WHY IT MATTERS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
                Why smart retailers are adding virtual try-on now
              </h2>
              <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
                We&apos;re seeing UK online retailers treat virtual try-on less like a “nice-to-have” and more like
                part of a modern product page. When shoppers can quickly see a garment on themselves, they hesitate
                less. That usually means you increase conversions, reduce returns, and build trust—because customers
                feel like they know what they&apos;re buying.
              </p>
              <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-600 md:text-base">
                Wear Me is designed to make that upgrade feel easy: an easy integration, a familiar “Wear Me” moment
                on the PDP, and AI fashion technology doing the heavy lifting in the background.
              </p>
              <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-600 md:text-base">
                If you&apos;ve ever watched shoppers hover between sizes, colours, or silhouettes, you know how
                expensive that hesitation can be. Virtual try-on doesn&apos;t solve everything—but it removes a big
                chunk of guesswork at the exact moment shoppers are deciding.
              </p>
              <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-600 md:text-base">
                For UK online retailers, that&apos;s often the difference between a strong season and a returns
                headache. Wear Me is meant to be a calm, practical tool you can turn on, measure, and grow with.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">FAQ</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Quick answers
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              If you&apos;re evaluating virtual try-on for the first time, these are the questions we hear most from
              UK online retailers—especially teams who want the upside without adding chaos to their storefront.
            </p>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Does it work on mobile?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Yes. Most try-ons happen on mobile, so we made sure it works great on iPhone and Android (and of
                  course tablet + desktop too).
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  That&apos;s important because a lot of fashion browsing is idle scrolling that turns into a
                  purchase later. If virtual try-on only feels good on desktop, you&apos;re leaving money on the
                  table.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Wear Me is built to behave like a normal part of a mobile PDP: quick to open, quick to try, quick
                  to understand.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">How long does it take to install?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Usually under 5 minutes. If you can paste a snippet into your theme (or ask your dev to), you can get
                  it live.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Most teams do a simple sanity check first: install, open a product page, run a try-on, confirm it
                  looks right. After that, you can roll it out more widely when you&apos;re comfortable.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  If you&apos;re on Shopify or WooCommerce and you&apos;ve edited theme files before, you&apos;ll
                  recognise the workflow immediately.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">What happens when usage limit is reached?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  We show a friendly message to shoppers and pause try-ons for that key, so nothing breaks on your
                  site. Then you can top up or upgrade when you&apos;re ready.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  The goal is to avoid a weird broken experience that makes your store look flaky. Shoppers should feel
                  like the limit is normal and understandable—not like something went wrong.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  On your side, it&apos;s a clean signal too: you can see usage climbing and plan ahead, rather than
                  getting surprised after the fact.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Is my API key safe?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Yes. Your Wear Me key identifies your store and tracks usage. Shoppers never see your private
                  provider keys—they stay server-side.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Think of the Wear Me key like a storefront identifier: it tells the system which account to bill and
                  how much virtual try-on you&apos;ve used. It isn&apos;t something shoppers need to understand.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  If you ever rotate keys, you can treat it like any other integration credential—swap the snippet,
                  confirm traffic, move on.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-14">
              <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                    Ready to add virtual try-on to your store?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
                    Try the demo and picture it on your product pages. It&apos;s the quickest way to see if it feels
                    right for your brand.
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
                    If you like what you see, you can start small: pick a category where returns hurt the most, add
                    Wear Me there, and compare what changes. Virtual try-on is easiest to believe once you&apos;ve
                    watched a few real shoppers use it.
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
                    And if you&apos;re a UK retailer juggling seasonal drops, promos, and tight ops, that kind of
                    low-risk rollout tends to feel a lot more realistic than a big-bang project.
                  </p>
                </div>
                <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
                  Try Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
