/** Served from <code>public/fittingroom.png</code>. */
const FITTING_ROOM_BG = "/fittingroom.png";

/**
 * Full-viewport photo background + dark gradient overlay behind all pages.
 */
export function SiteBackground() {
  return (
    <div className="app-bg pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="app-bg__base" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${FITTING_ROOM_BG}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/52 to-black/78 md:from-black/70 md:via-black/45 md:to-black/68" />
    </div>
  );
}
