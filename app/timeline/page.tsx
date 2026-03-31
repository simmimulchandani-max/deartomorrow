'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnlockModal from "@/components/components/UnlockModal";

const STORAGE_KEY = "dear-tomorrow-memories";

type MemoryRecord = {
  id: string;
  title: string;
  message: string;
  unlockDate: string;
  imageName: string | null;
  imageDataUrl: string | null;
  createdAt: string;
};

function isUnlocked(unlockDate: string) {
  const today = new Date().toISOString().split("T")[0];
  return unlockDate <= today;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatCreatedAt(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function buildShareLinks(memory: MemoryRecord) {
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${memory.title} - ${memory.message}`;

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(shareText)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(
      `${shareText} ${shareUrl}`
    )}`,
  };
}

export default function TimelinePage() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(null);

  useEffect(() => {
    function loadMemories() {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const parsed: MemoryRecord[] = stored ? JSON.parse(stored) : [];
        const sorted = [...parsed].sort((left, right) => {
          if (left.unlockDate === right.unlockDate) {
            return right.createdAt.localeCompare(left.createdAt);
          }

          return left.unlockDate.localeCompare(right.unlockDate);
        });

        setMemories(sorted);
      } catch {
        setMemories([]);
      } finally {
        setIsLoaded(true);
      }
    }

    loadMemories();
    window.addEventListener("storage", loadMemories);

    return () => {
      window.removeEventListener("storage", loadMemories);
    };
  }, []);

  const summary = useMemo(() => {
    const unlockedCount = memories.filter((memory) =>
      isUnlocked(memory.unlockDate)
    ).length;

    return {
      total: memories.length,
      unlocked: unlockedCount,
      locked: memories.length - unlockedCount,
    };
  }, [memories]);

  function openMemory(memory: MemoryRecord) {
    setSelectedMemory(memory);
  }

  function deleteMemory(memoryId: string) {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this memory?"
    );

    if (!shouldDelete) {
      return;
    }

    setMemories((current) => {
      const next = current.filter((memory) => memory.id !== memoryId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    if (selectedMemory?.id === memoryId) {
      setSelectedMemory(null);
    }
  }

  function closeModal() {
    setSelectedMemory(null);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f7f2e9_0%,_#f8f6f1_34%,_#e5eff5_78%,_#d9e9f2_100%)] px-6 py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-2%] h-72 w-72 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-[-18%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(236,221,194,0.86)_42%,_rgba(233,216,188,0)_75%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="rounded-[2.25rem] border border-white/60 bg-white/55 px-8 py-10 shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:px-12 sm:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.38em] text-sky-800/55">
                Timeline
              </p>
              <h1 className="mt-5 font-[family:var(--font-display)] text-5xl leading-[0.95] text-slate-800 sm:text-6xl">
                Your future archive, unfolding in time.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Saved memories wait here until their date arrives. Unlocked
                notes can be opened now, while future ones stay soft and out of
                reach.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/"
                className="inline-flex rounded-full border border-slate-300/70 bg-white/45 px-6 py-3 text-sm font-semibold tracking-[0.18em] text-slate-700 transition hover:border-sky-300 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
              >
                Back Home
              </Link>
              <Link
                href="/create"
                className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold tracking-[0.18em] text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
              >
                Create a Memory
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.6rem] border border-white/50 bg-white/45 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Total
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-800">
                {summary.total}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-emerald-100/80 bg-emerald-50/50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-700/70">
                Unlocked
              </p>
              <p className="mt-3 text-3xl font-semibold text-emerald-900">
                {summary.unlocked}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-sky-100/80 bg-sky-50/50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700/70">
                Locked
              </p>
              <p className="mt-3 text-3xl font-semibold text-sky-900">
                {summary.locked}
              </p>
            </div>
          </div>
        </header>

        {!isLoaded ? (
          <section className="rounded-[2.25rem] border border-white/60 bg-white/55 px-8 py-16 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-700/60">
              Loading
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Gathering your saved memories.
            </p>
          </section>
        ) : null}

        {isLoaded && memories.length === 0 ? (
          <section className="rounded-[2.25rem] border border-white/60 bg-white/55 px-8 py-16 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:px-12">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-700/60">
              No memories yet
            </p>
            <h2 className="mt-4 font-[family:var(--font-display)] text-4xl text-slate-800 sm:text-5xl">
              Nothing is waiting here just yet.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Create your first memory and it will appear here with its unlock
              status.
            </p>
            <Link
              href="/create"
              className="mt-10 inline-flex rounded-full bg-slate-900 px-7 py-3 text-sm font-semibold tracking-[0.18em] text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
            >
              Create a Memory
            </Link>
          </section>
        ) : null}

        {isLoaded && memories.length > 0 ? (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => {
              const unlocked = isUnlocked(memory.unlockDate);

              return (
                <article
                  key={memory.id}
                  className={`group relative overflow-hidden rounded-[2rem] border bg-white/60 text-left shadow-[0_20px_80px_rgba(88,110,124,0.12)] backdrop-blur-md transition ${
                    unlocked
                      ? "border-white/70 hover:-translate-y-1 hover:bg-white/78"
                      : "border-white/50 opacity-90"
                  }`}
                >
                  <div
                    className={`absolute inset-0 transition ${
                      unlocked
                        ? "bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.04)_100%)]"
                        : "bg-white/8 backdrop-blur-[6px]"
                    }`}
                  />
                  <div className={`relative p-6 ${unlocked ? "" : "blur-[2px]"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            unlocked
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-sky-50 text-sky-800"
                          }`}
                        >
                          {unlocked ? "Unlocked" : "Locked"}
                        </span>
                        <h2 className="mt-4 line-clamp-2 font-[family:var(--font-display)] text-3xl leading-tight text-slate-800">
                          {memory.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMemory(memory.id)}
                        className="shrink-0 rounded-full border border-rose-200/80 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40"
                        aria-label={`Delete memory ${memory.title}`}
                      >
                        Delete
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (unlocked) {
                          openMemory(memory);
                        }
                      }}
                      disabled={!unlocked}
                      className={`mt-5 block w-full rounded-[1.6rem] text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 ${
                        unlocked
                          ? "cursor-pointer active:translate-y-px"
                          : "cursor-not-allowed"
                      }`}
                      aria-label={
                        unlocked
                          ? `Open memory ${memory.title}`
                          : `Memory ${memory.title} is still locked`
                      }
                    >
                      {memory.imageDataUrl ? (
                        <div className="overflow-hidden rounded-[1.5rem]">
                          <Image
                            src={memory.imageDataUrl}
                            alt={memory.title}
                            width={640}
                            height={320}
                            unoptimized
                            className={`h-48 w-full object-cover transition ${
                              unlocked ? "" : "scale-[1.03]"
                            }`}
                          />
                        </div>
                      ) : (
                        <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,_rgba(248,244,236,0.95),_rgba(232,241,246,0.9))] px-5 py-8">
                          <p className="text-sm leading-7 text-slate-500">
                            {unlocked
                              ? "Ready to be opened."
                              : "Waiting quietly for its day."}
                          </p>
                        </div>
                      )}

                      <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">
                        {unlocked
                          ? memory.message
                          : "This memory is still tucked away. Its full message will appear when the unlock date arrives."}
                      </p>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                        <span>Unlocks {formatDate(memory.unlockDate)}</span>
                        <span>Saved {formatCreatedAt(memory.createdAt)}</span>
                      </div>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </section>

      {selectedMemory ? (
        <UnlockModal
          memory={selectedMemory}
          onClose={closeModal}
          onDelete={deleteMemory}
          shareLinks={buildShareLinks(selectedMemory)}
          metaText={`Unlocked ${formatDate(
            selectedMemory.unlockDate
          )} • Saved ${formatCreatedAt(selectedMemory.createdAt)}`}
        />
      ) : null}
    </main>
  );
}
