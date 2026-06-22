import Link from "next/link";
import { getSocialLinks } from "@/lib/socialLinks";

const CONTACT_EMAIL = "hello@until-tomorrow.com";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact / Feedback" },
];

function TikTokIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M16.8 3c.3 2.1 1.5 3.5 3.4 3.9v3.2a7.2 7.2 0 0 1-3.5-1.1v6.1a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.1.1v3.3a2.4 2.4 0 1 0 1.3 2.1V3h3.4Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm5-2.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
    </svg>
  );
}

export default function SiteFooter() {
  const socialLinks = getSocialLinks();

  return (
    <footer className="border-t border-white/50 bg-[rgba(247,242,233,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-7 text-center sm:text-left lg:flex-row lg:items-center lg:justify-between">
        <div>
          {/* Shared footer branding */}
          <p className="text-sm font-semibold tracking-[0.16em] text-[#4a3c31]">
            Until Tomorrow
          </p>
          <p className="mt-2 text-sm leading-7 text-[#6f6055]">
            Capture a moment for your future self.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 lg:items-end">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#4a3c31]"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7b6a4]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-sm font-medium text-[#6f6055] transition hover:text-[#4a3c31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7b6a4]"
            >
              {CONTACT_EMAIL}
            </a>
            <a
              href={socialLinks.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-[#4a3c31] transition hover:scale-105 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7b6a4]"
            >
              <TikTokIcon />
              TikTok
            </a>
            <a
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-[#4a3c31] transition hover:scale-105 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7b6a4]"
            >
              <InstagramIcon />
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
