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
  // The start page goes through the "pages" rule below (with its timeout) instead of next-pwa's own,
  // which waited for the network with no time limit.
  cacheStartUrl: false,
  dynamicStartUrl: false,
  // These replace next-pwa's defaults of the same name (the rest are kept).
  extendDefaultRuntimeCaching: true,
  workboxOptions: { disableDevLogs: true, runtimeCaching: offlineCaching() },
});

/**
 * How the phone app loads with a bad connection. Away from home without the VPN, a request to the
 * PC doesn't fail, it hangs (up to a minute on iOS), so pages and data wait at most a few seconds for
 * the PC and then use the copy saved on the phone; at home they're always fresh. Saved pages last 30
 * days (was 1), and the app's code, whose file names change with every version, a year: before, a day
 * without the PC meant the app couldn't start at all. Writes never come here: they go through the
 * outbox (src/lib/offline/outbox.ts). Each urlPattern is copied into the service worker as is, so it
 * can't use anything from this file.
 */
function offlineCaching() {
  const DAY = 24 * 60 * 60;
  const network = (cacheName, urlPattern, timeout, maxEntries) => ({
    urlPattern,
    handler: "NetworkFirst",
    method: "GET",
    options: { cacheName, networkTimeoutSeconds: timeout, expiration: { maxEntries, maxAgeSeconds: 30 * DAY } },
  });
  return [
    {
      urlPattern: /\/_next\/static.+\.js$/i,
      handler: "CacheFirst",
      options: { cacheName: "next-static-js-assets", expiration: { maxEntries: 400, maxAgeSeconds: 365 * DAY } },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-js-assets", expiration: { maxEntries: 64, maxAgeSeconds: 30 * DAY } },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-style-assets", expiration: { maxEntries: 64, maxAgeSeconds: 365 * DAY } },
    },
    network(
      "pages-rsc-prefetch",
      ({ request, url: { pathname }, sameOrigin }) =>
        request.headers.get("RSC") === "1" && request.headers.get("Next-Router-Prefetch") === "1" && sameOrigin && !pathname.startsWith("/api/"),
      2,
      64,
    ),
    network("pages-rsc", ({ request, url: { pathname }, sameOrigin }) => request.headers.get("RSC") === "1" && sameOrigin && !pathname.startsWith("/api/"), 2, 96),
    network("pages", ({ url: { pathname }, sameOrigin }) => sameOrigin && !pathname.startsWith("/api/"), 2.5, 96),
    network("apis", ({ url: { pathname }, sameOrigin }) => sameOrigin && pathname.startsWith("/api/") && !pathname.startsWith("/api/log"), 3, 64),
  ];
}

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
