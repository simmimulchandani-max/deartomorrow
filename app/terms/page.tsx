import type { Metadata } from "next";

const CONTACT_EMAIL = "hello@until-tomorrow.com";

const sections = [
  {
    title: "What Until Tomorrow Does",
    copy: "Until Tomorrow lets users create digital time capsules with messages, photos, videos, unlock dates, and shared capsule contributions.",
  },
  {
    title: "Your Content",
    copy: "You own the content you upload. By using Until Tomorrow, you give us permission to store, process, and display your content so the service can work.",
  },
  {
    title: "Privacy",
    copy: "Your memories are private by default. You are responsible for choosing what to upload and who you share links with.",
  },
  {
    title: "Acceptable Use",
    copy: "You agree not to upload or share content that is illegal, harmful, abusive, hateful, sexually exploitative, invasive of privacy, or violates someone else's rights.",
  },
  {
    title: "Shared Capsules",
    copy: "If you create or contribute to a shared capsule, your submitted content may be visible to the capsule owner and/or people with access to that capsule when it unlocks.",
  },
  {
    title: "No Guarantees",
    copy: "We do our best to keep Until Tomorrow available and working, but we cannot guarantee uninterrupted access, permanent storage, or error-free performance.",
  },
  {
    title: "Account And Content Removal",
    copy: "We may remove content or restrict access if we believe it violates these terms, creates risk, or harms the service or other users.",
  },
  {
    title: "Changes To The Service",
    copy: "We may update, change, or discontinue parts of the service over time.",
  },
  {
    title: "Limitation Of Liability",
    copy: "Until Tomorrow is provided as-is. To the fullest extent allowed by law, we are not responsible for indirect, incidental, or consequential damages related to use of the service.",
  },
];

export const metadata: Metadata = {
  title: "Terms of Use | Until Tomorrow",
  description: "The terms that apply when using Until Tomorrow.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_48%,_#d6ebf5_100%)] px-6 py-14 text-[#4a3c31] sm:px-8">
      <article className="mx-auto max-w-4xl rounded-[2rem] border border-white/65 bg-white/55 px-6 py-9 shadow-[0_24px_90px_rgba(88,110,124,0.14)] backdrop-blur sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a786d]">
          Last updated: June 22, 2026
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#4a3c31] sm:text-5xl">
          Terms of Use
        </h1>
        <p className="mt-5 text-base leading-8 text-[#5f5147]">
          Welcome to Until Tomorrow. By using this website, you agree to these
          Terms of Use.
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold text-[#4a3c31]">{section.title}</h2>
              <p className="mt-3 text-base leading-8 text-[#5f5147]">{section.copy}</p>
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Contact</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              Questions can be sent to{" "}
              <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
