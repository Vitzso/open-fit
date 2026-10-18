import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Service workers only make sense for production builds (and iOS only
  // registers them on a secure origin — see SETUP.md "HTTPS").
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  fallbacks: { document: "/offline" },
  workboxOptions: { disableDevLogs: true },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets the iPhone (another device on your LAN) load dev-mode assets.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  poweredByHeader: false,
  experimental: {
    // How long the phone reuses pages it already has before asking the PC again.
    // Every round trip over mobile data/Tailscale costs ~0.3 s, so reusing recent
    // pages makes tab switches instant. Any save clears this cache immediately,
    // so the only staleness is edits made from another device (max 60 s).
    staleTimes: { dynamic: 30, static: 60 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stop other sites from framing the app (clickjacking the delete buttons).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak your LAN address to Open Food Facts' image server. Must not be
          // "no-referrer": that makes browsers send `Origin: null` on same-origin form
          // posts, which the CSRF check in middleware.ts would then reject.
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
