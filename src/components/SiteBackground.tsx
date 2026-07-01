/**
 * Full-viewport photo background + dark gradient overlay behind all pages.
 * Photo is a fixed root-level img (not nested in a fixed wrapper) to avoid Android scroll repaint jank.
 */
export function SiteBackground() {
  return (
    <>
      <img
        src="/fittingroom.png"
        alt=""
        aria-hidden
        className="pointer-events-none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: -1,
        }}
      />
      <div className="app-bg pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/52 to-black/78 md:from-black/70 md:via-black/45 md:to-black/68" />
      </div>
    </>
  );
}
