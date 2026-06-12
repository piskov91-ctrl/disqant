import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [{ source: "/pricing", destination: "/subscriptions", permanent: true }];
  },
  async headers() {
    // Explicitly allow same-origin camera access so the demo try-on modal's
    // getUserMedia call works on Android Chrome (which blocks the request when a
    // restrictive Permissions-Policy is present or inferred). `self` permits the
    // page's own origin; cross-origin iframes remain disallowed by default.
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
