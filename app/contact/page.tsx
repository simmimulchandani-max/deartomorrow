import type { Metadata } from "next";
import Link from "next/link";

const CONTACT_EMAIL = "hello@until-tomorrow.com";

const contactReasons = [
  "Report a bug",
  "Share feedback",
  "Request content deletion",
  "Ask a question",
];

export const metadata: Metadata = {
  title: "Contact / Feedback | Until Tomorrow",
  description: "Contact Until Tomorrow for questions, feedback, bug reports, or deletion requests.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_48%,_#d6ebf5_100%)] px-6 py-14 text-[#4a3c31] sm:px-8">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/65 bg-white/55 px-6 py-10 text-center shadow-[0_24px_90px_rgba(88,110,124,0.14)] backdrop-blur sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a786d]">
          Contact / Feedback
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#4a3c31] sm:text-5xl">
          We&apos;d love to hear from you.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#5f5147]">
          For questions, feedback, bug reports, or deletion requests, email:
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#f7c7b6] px-6 text-sm font-bold text-[#4a3c31] transition hover:bg-[#f4bba8]"
        >
          {CONTACT_EMAIL}
        </a>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          {contactReasons.map((reason) => (
            <div
              key={reason}
              className="rounded-[1.25rem] border border-white/70 bg-white/55 px-4 py-4 text-sm font-semibold text-[#4a3c31] shadow-sm"
            >
              {reason}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/70 bg-white/45 px-5 py-5">
          <p className="text-sm leading-7 text-[#5f5147]">
            Prefer the in-app feedback form? You can send structured feedback and
            include a screenshot from the feedback page.
          </p>
          <Link
            href="/feedback"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[#e7b6a4] bg-white/70 px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-white"
          >
            Open Feedback Form
          </Link>
        </div>
      </section>
    </main>
  );
}
