import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

// Runs before paint so the page never flashes the wrong theme: an explicit
// choice in localStorage wins, otherwise fall back to the OS preference.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cook for a Crowd",
  description: "Plan meals, scale recipes to a headcount, and build a shopping list.",
};

// Every page here reads straight from the local SQLite file, with no
// `fetch()` calls for Next's cache heuristics to key off of -- left to its
// own defaults, Next.js silently prerenders a route like `/` (no obvious
// per-request signal) as static HTML at build time and keeps serving that
// snapshot until something else happens to invalidate it. Verified this
// is a real, user-visible bug: a fresh production server showed "no
// events yet" on the dashboard even with events already in the database,
// until a Server Action on some other page incidentally revalidated it.
// Forcing every route dynamic here, once, is more robust than remembering
// a per-page `export const dynamic` on every current and future page.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10 print:hidden">
          <nav className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold">
              🍲 Cook for a Crowd
            </Link>
            <Link href="/" className="text-sm text-black/70 dark:text-white/70 hover:underline">
              Events
            </Link>
            <Link
              href="/recipes"
              className="text-sm text-black/70 dark:text-white/70 hover:underline"
            >
              Recipes
            </Link>
            <Link
              href="/settings"
              className="text-sm text-black/70 dark:text-white/70 hover:underline"
            >
              Settings
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 print:max-w-none print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}
