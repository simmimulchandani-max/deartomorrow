"use client";

import Link from "next/link";
import { use } from "react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import MemoryCard from "@/components/components/MemoryCard";
import UnlockCelebration from "@/components/components/UnlockCelebration";

type Capsule = {
  id: string;
  title: string;
  unlockDate: string;
  createdAt: string;
};

type Memory = {
  capsuleId: string;
  message: string;
  name: string;
  createdAt: string;
};

type CapsuleResponse = {
  capsule?: Capsule;
  error?: string;
};

type MemoriesResponse = {
  memories?: Memory[];
  count?: number;
  error?: string;
};

function todayInLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatTimestamp(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function rotationClass(index: number) {
  const rotations = [
    "rotate-[-2deg]",
    "rotate-[1.5deg]",
    "rotate-[-1deg]",
    "rotate-[2.5deg]",
    "rotate-[-3deg]",
    "rotate-[3deg]",
  ];

  return rotations[index % rotations.length];
}

export default function CapsulePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const isUnlocked = useMemo(() => {
    if (!capsule) {
      return false;
    }

    return todayInLocalDate() >= capsule.unlockDate;
  }, [capsule]);

  const loadCapsule = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [capsuleResponse, memoriesResponse] = await Promise.all([
        fetch(`/api/capsules?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        }),
        fetch(`/api/memories?capsuleId=${encodeURIComponent(id)}`, {
          cache: "no-store",
        }),
      ]);

      const capsulePayload = (await capsuleResponse.json()) as CapsuleResponse;
      const memoriesPayload =
        (await memoriesResponse.json()) as MemoriesResponse;

      if (!capsuleResponse.ok || !capsulePayload.capsule) {
        throw new Error(capsulePayload.error ?? "Capsule not found.");
      }

      if (!memoriesResponse.ok) {
        throw new Error(memoriesPayload.error ?? "Unable to load memories.");
      }

      setCapsule(capsulePayload.capsule);
      setMemories(memoriesPayload.memories ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load this capsule."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCapsule();
  }, [loadCapsule]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await fetch("/api/memories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capsuleId: id,
          message,
          name,
        }),
      });

      const payload = (await response.json()) as {
        memory?: Memory;
        error?: string;
      };

      if (!response.ok || !payload.memory) {
        throw new Error(payload.error ?? "Unable to submit memory.");
      }

      setMessage("");
      setName("");
      setSubmitSuccess("Memory added to the capsule.");
      await loadCapsule();
    } catch (caughtError) {
      setSubmitError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit memory."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Link copied.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Unable to copy link.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fff8e5_0%,_#f4e6cc_42%,_#dcebf4_100%)] px-6 py-12">
        <div className="rounded-[2rem] border border-white/60 bg-white/60 px-8 py-10 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md">
          <p className="text-elevated text-sm uppercase tracking-[0.24em]">
            Loading Capsule
          </p>
        </div>
      </main>
    );
  }

  if (error || !capsule) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fff8e5_0%,_#f4e6cc_42%,_#dcebf4_100%)] px-6 py-12">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/60 p-8 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md">
          <p className="text-elevated text-sm uppercase tracking-[0.24em]">
            Capsule Not Found
          </p>
          <h1 className="mt-4 font-[family:var(--font-display)] text-4xl text-slate-800">
            We couldn&apos;t find that capsule.
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {error || "The link may be invalid or the capsule may no longer exist."}
          </p>
          <Link
            href="/create"
            className="mt-8 inline-flex rounded-full bg-[#f7c7b6] px-6 py-3 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition hover:bg-[#f4bba8]"
          >
            Create Capsule
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f4e6cc_42%,_#dcebf4_100%)] px-6 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-0 h-72 w-72 rounded-full bg-white/45 blur-3xl" />
        <div className="absolute right-[-8%] top-[16%] h-96 w-96 rounded-full bg-[#f7d2c1]/35 blur-3xl" />
        <div className="absolute bottom-[-16%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(233,216,188,0)_75%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[2rem] border border-white/60 bg-white/55 p-8 shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-elevated text-xs font-semibold uppercase tracking-[0.3em]">
                Capsule
              </p>
              <h1 className="mt-3 font-[family:var(--font-display)] text-4xl text-slate-800 sm:text-5xl">
                {capsule.title}
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Unlocks on {formatDate(capsule.unlockDate)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {memories.length} {memories.length === 1 ? "memory" : "memories"} submitted
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex rounded-full border border-white/70 bg-white/80 px-5 py-3 text-sm font-semibold tracking-[0.16em] text-slate-700 transition hover:bg-white"
              >
                Copy Link
              </button>
              <Link
                href="/create"
                className="inline-flex rounded-full bg-[#f7c7b6] px-5 py-3 text-sm font-semibold tracking-[0.16em] text-[#4a3c31] transition hover:bg-[#f4bba8]"
              >
                New Capsule
              </Link>
            </div>
          </div>

          {copyStatus ? (
            <p className="mt-4 text-sm text-slate-600">{copyStatus}</p>
          ) : null}
        </header>

        {!isUnlocked ? (
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[2rem] border border-sky-100/70 bg-sky-50/60 p-8 shadow-[0_20px_80px_rgba(88,110,124,0.12)] backdrop-blur-md">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700/80">
                Locked
              </p>
              <h2 className="mt-4 font-[family:var(--font-display)] text-4xl text-slate-800">
                This capsule is locked until {formatDate(capsule.unlockDate)}.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                You can still add a memory now. Everything stays tucked away
                until the unlock date arrives.
              </p>
            </article>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/60 bg-white/60 p-8 shadow-[0_20px_80px_rgba(88,110,124,0.12)] backdrop-blur-md"
            >
              <p className="text-elevated text-sm font-semibold uppercase tracking-[0.24em]">
                Submit Memory
              </p>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="message"
                    className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700"
                  >
                    Write a memory
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Remember the road trip, the inside joke, the small brave moment..."
                    className="w-full resize-none rounded-[1.25rem] border border-white/70 bg-white/85 px-4 py-3.5 text-slate-800 outline-none transition focus:border-sky-200"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700"
                  >
                    Name (optional)
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="From a friend"
                    className="w-full rounded-[1.25rem] border border-white/70 bg-white/85 px-4 py-3.5 text-slate-800 outline-none transition focus:border-sky-200"
                  />
                </div>

                {submitError ? (
                  <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </p>
                ) : null}

                {submitSuccess ? (
                  <p className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {submitSuccess}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="space-y-6">
            <UnlockCelebration />

            <article className="rounded-[2rem] border border-emerald-100/80 bg-emerald-50/60 p-8 shadow-[0_20px_80px_rgba(88,110,124,0.12)] backdrop-blur-md">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700/80">
                Unlocked
              </p>
              <h2 className="mt-4 font-[family:var(--font-display)] text-4xl text-slate-800">
                The memories are ready.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Every submitted note is now visible below.
              </p>
            </article>

            {memories.length === 0 ? (
              <div className="rounded-[2rem] border border-white/60 bg-white/60 p-8 text-center shadow-[0_20px_80px_rgba(88,110,124,0.12)] backdrop-blur-md">
                <p className="text-base leading-8 text-slate-600">
                  No memories were submitted to this capsule.
                </p>
              </div>
            ) : (
              <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
                {memories.map((memory, index) => (
                  <MemoryCard
                    key={`${memory.createdAt}-${index}`}
                    message={memory.message}
                    name={memory.name}
                    createdAtLabel={formatTimestamp(memory.createdAt)}
                    tiltClassName={rotationClass(index)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
