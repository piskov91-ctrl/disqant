/**
 * Full-viewport photo background + dark gradient overlay behind all pages.
 */
export function SiteBackground() {
  return (
    <div className="app-bg pointer-events-none fixed inset-0 z-0 bg-black" aria-hidden>
      <img
        src="/fittingroom.png"
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/52 to-black/78 md:from-black/70 md:via-black/45 md:to-black/68" />
    </div>
  );
}
