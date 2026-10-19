import { NextResponse, type NextRequest } from "next/server";
import { isAllowedHost, isValidSession, SESSION_COOKIE } from "@/lib/auth";

// Paths that work without signing in: the login flow and what iOS needs to
// install the Home Screen app.
const PUBLIC = [
  /^\/login$/,
  /^\/api\/login$/,
  // Apple Health Shortcut: authenticated by its own device token inside the route.
  /^\/api\/ingest\/health$/,
  /^\/offline$/,
  /^\/manifest\.webmanifest$/,
  /^\/apple-icon/,
  /^\/pwa-icon\//,
  /^\/ca\.crt$/, // public CA certificate, needed before the phone can even trust the login page
  // Public-domain exercise photos. Nothing private, and the offline cache may
  // fetch them before you've signed in (it would otherwise store the login page).
  /^\/exercises\/[a-z0-9-]+\/[01]\.jpg$/,
  // Pro training module: library photos (public domain), same reasoning as above.
  /^\/api\/modules\/training-pro\/img\/[A-Za-z0-9_-]+\/[01]\.jpg$/,
];

const json = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAllowedHost(req.headers.get("host"))) {
    return new NextResponse("Unknown host. Add it to ALLOWED_HOSTS in .env if this is intentional.", { status: 421 });
  }

  // Cross-site request forgery: reject writes that come from another origin.
  // Next.js already checks this for server actions; this extends it to the API routes.
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        /* "null" or garbage: treat as cross-site */
      }
      if (originHost !== req.headers.get("host")) return json(403, "Cross-origin request blocked.");
    }
  }

  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  if (!(await isValidSession(req.cookies.get(SESSION_COOKIE)?.value))) {
    if (pathname.startsWith("/api/")) return json(401, "Locked. Sign in with your passcode.");
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except static build assets and the service worker files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-|swe-worker-|fallback-).*)"],
};
