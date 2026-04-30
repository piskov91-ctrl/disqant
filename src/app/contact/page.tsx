import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Fit Room",
  description: "Get in touch about virtual try-on, integrations, and partnerships.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="pt-[150px]">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
              Contact
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Let&apos;s talk
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Tell us a bit about your store and we&apos;ll follow up. For a faster reply, include how you want to use
              virtual try-on and your platform (e.g. Shopify).
            </p>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-xl px-6">
            <ContactForm />
            <p className="mt-8 text-center text-sm text-zinc-500">
              You can also email us at{" "}
              <a
                href="mailto:hello@fit-room.com"
                className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
              >
                hello@fit-room.com
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
