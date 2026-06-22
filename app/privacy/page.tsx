import type { Metadata } from "next";

const CONTACT_EMAIL = "hello@until-tomorrow.com";

const sections = [
  {
    title: "Information We Collect",
    items: [
      "Account information, such as your email address when you sign in.",
      "Memory content you choose to upload, including photos, videos, messages, titles, unlock dates, and capsule contributions.",
      "Feedback and support messages you choose to send us.",
    ],
  },
  {
    title: "How We Use Your Information",
    items: [
      "To create, store, and display your memories and capsules.",
      "To unlock memories on the date you selected.",
      "To send unlock notifications and product-related emails.",
      "To improve, debug, and protect the service.",
      "To respond to feedback or support requests.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Privacy Policy | Until Tomorrow",
  description: "How Until Tomorrow collects, uses, and protects your memories.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_48%,_#d6ebf5_100%)] px-6 py-14 text-[#4a3c31] sm:px-8">
      <article className="mx-auto max-w-4xl rounded-[2rem] border border-white/65 bg-white/55 px-6 py-9 shadow-[0_24px_90px_rgba(88,110,124,0.14)] backdrop-blur sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a786d]">
          Last updated: June 22, 2026
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[#4a3c31] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-5 text-base leading-8 text-[#5f5147]">
          Until Tomorrow helps you create digital time capsules with photos, videos,
          written messages, and unlock dates. This Privacy Policy explains what we
          collect, how we use it, and the choices you have.
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold text-[#4a3c31]">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-[#5f5147]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Your Memories</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              Your memories belong to you. We do not claim ownership of the photos,
              videos, messages, or other content you upload. Your content remains
              yours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Private By Default</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              Your memories are private by default. You control the unlock date and
              who can access them. If you create or share a capsule link, people
              with that link may be able to contribute or view content depending on
              the capsule settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Media Uploads</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              Photos and videos you upload are stored so they can be shown when your
              memory or capsule unlocks. We do not sell your uploaded photos,
              videos, messages, or personal content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Sharing</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              We do not sell your personal information. We may share limited
              information with service providers that help us operate the site, such
              as authentication, hosting, storage, and email delivery providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Data Deletion</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              You can delete memories from your account where deletion is available
              in the product. If you need help deleting your account or content,
              email{" "}
              <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Security</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              We take reasonable measures to protect your content and account
              information. While no online service can guarantee perfect security,
              protecting your memories is important to us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Children</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              To comply with privacy regulations, Until Tomorrow is available to
              users who are at least 13 years old.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Changes To This Policy</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              We may update this Privacy Policy from time to time. If we make
              meaningful changes, we will update the date above.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Contact</h2>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              For questions, privacy requests, account deletion requests, or support,
              contact:
            </p>
            <p className="mt-3 text-base leading-8 text-[#5f5147]">
              <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
