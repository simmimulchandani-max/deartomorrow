'use client';

import Link from 'next/link';

const OPTION_CARD_CLASS =
  'group rounded-[1.75rem] border border-white/70 bg-gray-100 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md';
const OPTION_BUTTON_CLASS =
  'mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] shadow transition group-hover:bg-[#f4bba8]';

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
            CREATE
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#4a3c31] sm:text-5xl">
            What are you leaving for tomorrow?
          </h1>
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            Start a private memory for yourself, or gather memories from people
            you love into one shared capsule.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link href="/create/memory" className={OPTION_CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Memory
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#4a3c31]">
              Create a Memory
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Write a note, attach photos or videos, and save it for a future
              unlock date.
            </p>
            <span className={OPTION_BUTTON_CLASS}>Choose Memory</span>
          </Link>

          <Link href="/create/capsule" className={OPTION_CARD_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Capsule
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#4a3c31]">
              Create a Capsule
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Invite others to contribute hidden memories, then unlock the full
              collection when the day arrives.
            </p>
            <span className={OPTION_BUTTON_CLASS}>Choose Capsule</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
