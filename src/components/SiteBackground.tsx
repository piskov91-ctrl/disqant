"use client";

import { usePathname } from "next/navigation";

/**
 * Global dark backdrop: black base + 3 slow CSS-animated purple/blue gradient blobs.
 * Home (`/`) uses a plain black base only so the hero photo background is unobstructed.
 */
export function SiteBackground() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div
      className="app-bg pointer-events-none fixed inset-0 z-0"
      aria-hidden
    >
      <div className="app-bg__base" />
      {!isHome && (
        <>
          <div className="app-bg__blob app-bg__blob--1" />
          <div className="app-bg__blob app-bg__blob--2" />
          <div className="app-bg__blob app-bg__blob--3" />
        </>
      )}
    </div>
  );
}
