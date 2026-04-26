/**
 * Dark, slow-moving purple/blue gradient blobs (CSS keyframes, no Framer).
 * Renders as a full-bleed layer; parent should set `fixed inset-0` + z-index.
 */
export function AmbientBlobsBackground() {
  return (
    <div className="site-ambient-blobs" aria-hidden>
      <div className="site-ambient-blobs__base" />
      <div className="site-ambient-blobs__blob site-ambient-blobs__blob--1" />
      <div className="site-ambient-blobs__blob site-ambient-blobs__blob--2" />
      <div className="site-ambient-blobs__blob site-ambient-blobs__blob--3" />
      <div className="site-ambient-blobs__blob site-ambient-blobs__blob--4" />
    </div>
  );
}
