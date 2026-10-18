import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

// Self-hosted at build time, so the phone never fetches fonts from Google.
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "OpenFit",
  description: "Workouts, body weight, nutrition and a local AI coach.",
  applicationName: "OpenFit",
  appleWebApp: { capable: true, title: "OpenFit", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#15181d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh antialiased">
        <main className="pt-safe mx-auto max-w-xl px-5 pb-32">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
