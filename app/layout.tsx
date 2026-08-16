import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 print:max-w-none print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}
