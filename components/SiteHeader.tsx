"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Playfair_Display } from "next/font/google";

const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/timeline", label: "Timeline" },
  { href: "/create", label: "Create Memory" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-[rgba(247,242,233,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        {/* Shared brand mark and home link */}
        <Link
          href="/"
          className={`${brandFont.className} text-elevated inline-flex items-center gap-3 text-2xl leading-none transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79a87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f2e9]`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-sm">
            <Image
              src="/favicon.png"
              alt="Until Tomorrow logo"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
          </span>
          <span>Until Tomorrow</span>
        </Link>

        {/* Shared navigation links */}
        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(`${link.href}/`));

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[0.14em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79a87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f2e9] ${
                  isActive
                    ? "bg-[#f7c7b6] text-[#4a3c31] shadow-[0_12px_26px_rgba(74,60,49,0.12)]"
                    : "border border-white/70 bg-white/55 text-[#4a3c31] hover:bg-white/80"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
