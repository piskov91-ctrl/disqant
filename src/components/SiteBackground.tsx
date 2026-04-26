/**
 * Global dark backdrop: black base + 3 slow CSS-animated purple/blue gradient blobs.
 * Fixed under page content; see `app-bg` in `globals.css`.
 */
export function SiteBackground() {
  return (
    <div
      className="app-bg pointer-events-none fixed inset-0 z-0"
      aria-hidden
    >
      <div className="app-bg__base" />
      <div className="app-bg__blob app-bg__blob--1" />
      <div className="app-bg__blob app-bg__blob--2" />
      <div className="app-bg__blob app-bg__blob--3" />
    </div>
  );
}
