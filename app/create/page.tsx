"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Capsule = {
  id: string;
  title: string;
  unlockDate: string;
  createdAt: string;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    setMinDate(local.toISOString().slice(0, 10));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/capsules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          unlockDate,
        }),
      });

      const payload = (await response.json()) as {
        capsule?: Capsule;
        error?: string;
      };

      if (!response.ok || !payload.capsule) {
        throw new Error(payload.error ?? "Unable to create capsule.");
      }

      router.push(`/capsule/${payload.capsule.id}`);
    } catch (caughtError) {
      setError(formatError(caughtError));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f4e6cc_42%,_#dcebf4_100%)] px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-0 h-72 w-72 rounded-full bg-white/45 blur-3xl" />
        <div className="absolute right-[-8%] top-[16%] h-96 w-96 rounded-full bg-[#f7d2c1]/35 blur-3xl" />
        <div className="absolute bottom-[-16%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(233,216,188,0)_75%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-[2rem] border border-white/60 bg-white/55 p-8 shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-elevated text-xs font-semibold uppercase tracking-[0.3em]">
              Create Capsule
            </p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-4xl text-slate-800 sm:text-5xl">
              Start a capsule for tomorrow.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Give it a title, choose when it opens, and share the link with
              anyone who should leave a memory inside.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex rounded-full border border-white/70 bg-white/70 px-5 py-3 text-sm font-semibold tracking-[0.18em] text-slate-700 transition hover:bg-white"
          >
            Back Home
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[1.75rem] border border-white/60 bg-white/55 p-6 sm:p-8"
        >
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-elevated text-sm font-semibold uppercase tracking-[0.2em]"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="College reunion capsule"
              className="w-full rounded-[1.25rem] border border-white/70 bg-white/85 px-4 py-3.5 text-slate-800 outline-none transition focus:border-sky-200"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="unlockDate"
              className="text-elevated text-sm font-semibold uppercase tracking-[0.2em]"
            >
              Unlock Date
            </label>
            <input
              id="unlockDate"
              name="unlockDate"
              type="date"
              required
              min={minDate || undefined}
              value={unlockDate}
              onChange={(event) => setUnlockDate(event.target.value)}
              className="w-full rounded-[1.25rem] border border-white/70 bg-white/85 px-4 py-3.5 text-slate-800 outline-none transition focus:border-sky-200"
            />
          </div>

          {error ? (
            <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create Capsule"}
          </button>
        </form>
      </section>
    </main>
  );
}
