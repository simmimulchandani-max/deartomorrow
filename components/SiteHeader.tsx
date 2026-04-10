'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#eadfce] bg-[#F5F0E6]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-24 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#ded7cd] bg-white shadow-sm">
            <Image
              src="/favicon.png"
              alt="Until Tomorrow logo"
              width={34}
              height={34}
              className="h-auto w-auto"
              priority
            />
          </div>
          <span className="text-[2rem] font-semibold tracking-[-0.02em] text-[#4a3c31] sm:text-[2.2rem]">
            Until Tomorrow
          </span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] text-[#4a3c31] shadow-md transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a3c31]"
          >
            <span className="sr-only">Menu</span>
            <div className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </div>
          </button>

          {isOpen ? (
            <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[2rem] border border-[#eadfce] bg-[#F5F0E6] p-3 shadow-[0_24px_60px_rgba(74,60,49,0.18)]">
              <Link
                href="/"
                onClick={closeMenu}
                className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
              >
                Home
              </Link>
              <Link
                href="/timeline"
                onClick={closeMenu}
                className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
              >
                Timeline
              </Link>
              <Link
                href="/create"
                onClick={closeMenu}
                className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
              >
                Create Memory
              </Link>
              <Link
                href="/about"
                onClick={closeMenu}
                className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
              >
                About
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}