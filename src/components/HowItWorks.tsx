export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 border-y border-surface-border bg-surface-muted/40 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl space-y-14">
          <section>
            <h2 className="text-lg font-semibold text-[#C6A77D]">What is it</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              Wear Me is a virtual try-on tool that lets your customers see how clothes look on them before
              they buy. No changing rooms, no guessing, no returns.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#C6A77D]">How customers use it</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-base leading-relaxed text-zinc-600">
              <li>They see a &lsquo;Wear me&rsquo; button on your product page.</li>
              <li>They take a photo or upload one from their phone.</li>
              <li>In seconds they see themselves wearing the item.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#C6A77D]">Why it works</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              People buy more when they can see how something looks on them. And they return less because
              they already know it fits.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
