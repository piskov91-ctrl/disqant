"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { EtherealShadowBackground } from "@/components/EtherealShadowBackground";

/**
 * Renders the 21st.dev ethereal-shadow layer on all routes except `/`, and
 * toggles `body.site-ambient` for light-on-dark text styles (see `globals.css`).
 */
export function SiteAmbient() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (isHome) {
      document.body.classList.remove("site-ambient");
    } else {
      document.body.classList.add("site-ambient");
    }
    return () => {
      document.body.classList.remove("site-ambient");
    };
  }, [isHome]);

  if (isHome) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
      <EtherealShadowBackground />
    </div>
  );
}
