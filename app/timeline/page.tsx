'use client';

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CountdownText from "@/components/CountdownText";
import { buildMemoryPath } from "@/lib/memoryPaths";
import UnlockModal from "@/components/UnlockModal";
import { getSupabaseClient } from "@/lib/supabaseClient";
import SoftLoginCelebration from "@/components/SoftLoginCelebration";

const STORAGE_KEY = "dear-tomorrow-memories";

type MemoryRecord = {
  id: string;
  title: string;
  message: string;
  unlockDate: string;
  imageName: string | null;
  imageDataUrl: string | null;
  mediaUrl?: string | null;
  mediaUrls?: string[];
  createdAt: string;
};

const NAV_BUTTON_CLASS =
  "px-4 py-2 rounded-full bg-[#f7c7b6] border border-[#e7b6a4] shadow text-[#4a3c31] hover:bg-[#f4bba8]";
const MEMORY_PLACEHOLDER =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f8efe3'/%3E%3Cstop offset='100%25' stop-color='%23d9e8f0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' rx='36' fill='url(%23g)'/%3E%3Ccircle cx='156' cy='120' r='40' fill='%23fff8ef' fill-opacity='.95'/%3E%3Cpath d='M90 274c28-48 67-72 117-72 38 0 73 14 104 42 16 14 31 30 46 30 14 0 28-13 47-39 24-33 53-50 87-50 48 0 84 29 108 89H90Z' fill='%23f4c8b8' fill-opacity='.8'/%3E%3Cpath d='M44 286c45-35 92-53 141-53 43 0 88 15 136 45 30 19 60 29 92 29 34 0 67-10 99-31 33-21 61-32 85-32 16 0 31 3 45 10v70H44Z' fill='%23fffaf4' fill-opacity='.75'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%236d6159' font-family='Arial, sans-serif' font-size='28'%3EA memory waiting to bloom%3C/text%3E%3C/svg%3E";

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

function getMemoryThumbnail(memory: MemoryRecord) {
  return memory.imageDataUrl || memory.mediaUrls?.[0] || memory.mediaUrl || null;
}

function buildShareLinks(memory: MemoryRecord) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${buildMemoryPath(memory.id)}`
      : "";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showCelebration, setShowCelebration] = useState(
    searchParams.get("celebrate") === "1"
  );

  useEffect(() => {
    if (!showCelebration) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCelebration(false);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("celebrate");
      window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [showCelebration]);

  useEffect(() => {
    let isActive = true;

    async function requireSession() {
      // Protect this route by checking for an authenticated Supabase session.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (!session) {
        router.replace("/");
        return;
      }

      setIsCheckingSession(false);
    }

    void requireSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isActive) {
          return;
        }

        if (!session) {
          router.replace("/");
        }
      }
    );

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    if (isCheckingSession) {
      return;
    }

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
  }, [isCheckingSession]);

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

  async function handleLogout() {
    // Clear the current Supabase auth session, then return to the homepage.
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-12 sm:py-16">
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <div className="w-full rounded-3xl bg-gray-100 px-8 py-16 text-center shadow">
            <p className="text-sm uppercase tracking-[0.28em] text-gray-500">
              Checking session
            </p>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Making sure your timeline is ready for you.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-12 sm:py-16">
      {/* Soft post-login animation */}
      <SoftLoginCelebration active={showCelebration} />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="w-full bg-gray-100 rounded-3xl p-10 space-y-6 shadow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              <span className="text-sm font-semibold text-gray-500">TIMELINE</span>
              <h1 className="text-4xl font-bold leading-tight">
                Your future archive, unfolding in time.
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Saved memories wait here until their date arrives. Unlocked notes
                can be opened now, while future ones stay softly out of reach.
              </p>
              {showCelebration ? (
                <p className="inline-flex w-fit rounded-full border border-[#f0dbc9] bg-[#fff6ef] px-4 py-2 text-sm text-[#7b6658] shadow-sm">
                  Your magic link worked. Welcome back.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Timeline-specific action button */}
              <button
                type="button"
                onClick={handleLogout}
                className={`${NAV_BUTTON_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79a87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f0e6]`}
              >
                Log Out
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                Total
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-800">
                {summary.total}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">
                Unlocked
              </p>
              <p className="mt-3 text-3xl font-semibold text-emerald-900">
                {summary.unlocked}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700">
                Locked
              </p>
              <p className="mt-3 text-3xl font-semibold text-sky-900">
                {summary.locked}
              </p>
            </div>
          </div>
        </header>

        {!isLoaded ? (
          <section className="w-full bg-gray-100 rounded-3xl px-8 py-16 text-center shadow">
            <p className="text-sm uppercase tracking-[0.28em] text-gray-500">
              Loading
            </p>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Gathering your saved memories.
            </p>
          </section>
        ) : null}

        {isLoaded && memories.length === 0 ? (
          <section className="w-full bg-gray-100 rounded-3xl px-8 py-16 text-center shadow sm:px-12">
            <p className="text-sm uppercase tracking-[0.28em] text-gray-500">
              No memories yet
            </p>
            <h2 className="mt-4 text-4xl font-bold text-gray-800 sm:text-5xl">
              Nothing is waiting here just yet.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
              Create your first memory and it will appear here with its unlock
              status.
            </p>
            <button
              type="button"
              onClick={() => router.push("/create")}
              className={`mt-10 ${NAV_BUTTON_CLASS}`}
            >
              Create a Memory
            </button>
          </section>
        ) : null}

        {isLoaded && memories.length > 0 ? (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => {
              const unlocked = isUnlocked(memory.unlockDate);
              const previewMedia = getMemoryThumbnail(memory);
              const cardImageSrc = unlocked
                ? previewMedia ?? MEMORY_PLACEHOLDER
                : MEMORY_PLACEHOLDER;

              return (
                <article
                  key={memory.id}
                  className={`group relative overflow-hidden rounded-[2rem] border bg-[#fcfaf6] text-left shadow-[0_18px_50px_rgba(74,60,49,0.08)] transition ${
                    unlocked
                      ? "border-[#e7ddd2] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(74,60,49,0.12)]"
                      : "border-[#e7ddd2] opacity-90"
                  }`}
                >
                  <div
                    className={`absolute inset-0 transition ${
                      unlocked
                        ? "bg-transparent"
                        : "bg-white/20"
                    }`}
                  />
                  <div className="relative p-5 sm:p-6">
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
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMemory(memory.id)}
                        className="px-4 py-2 rounded-full bg-white border border-gray-300 shadow text-gray-700 hover:bg-gray-100"
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
                      className={`mt-5 block w-full rounded-[1.7rem] border border-[#efe4d8] bg-white/70 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 sm:p-4 ${
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
                      <div className="flex flex-col gap-4 sm:gap-5">
                        <div className="overflow-hidden rounded-[1.4rem] bg-[#f5ede3]">
                          <Image
                            src={cardImageSrc}
                            alt={memory.title}
                            width={640}
                            height={320}
                            unoptimized
                            className={`h-48 w-full object-cover transition sm:h-56 ${
                              unlocked ? "" : "scale-[1.03]"
                            }`}
                          />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-gray-800 sm:text-[1.75rem]">
                              {memory.title}
                            </h2>
                            <p className="mt-2 text-sm text-gray-500">
                              Unlocks {formatDate(memory.unlockDate)}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-2xl bg-[#faf4ed] px-4 py-3 text-sm text-gray-500 ring-1 ring-[#f0e3d6] sm:max-w-[13rem]">
                            <CountdownText
                              unlockDate={memory.unlockDate}
                              className="block"
                            />
                          </div>
                        </div>

                        <p className="line-clamp-3 text-sm leading-7 text-gray-600">
                          {unlocked
                            ? memory.message
                            : "This memory is still tucked away. Its full message will appear when the unlock date arrives."}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                          <span>Saved {formatCreatedAt(memory.createdAt)}</span>
                        </div>
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
          shareUrl={
            selectedMemory
              ? `${window.location.origin}${buildMemoryPath(selectedMemory.id)}`
              : ""
          }
          shareLinks={buildShareLinks(selectedMemory)}
          metaText={`Unlocked ${formatDate(
            selectedMemory.unlockDate
          )} - Saved ${formatCreatedAt(selectedMemory.createdAt)}`}
        />
      ) : null}
    </main>
  );
}
