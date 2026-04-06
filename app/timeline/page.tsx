'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import UnlockModal from "@/components/UnlockModal";

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
  const router = useRouter();
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
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-12 sm:py-16">
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
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={NAV_BUTTON_CLASS}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => router.push("/create")}
                className={NAV_BUTTON_CLASS}
              >
                Create a Memory
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
              const previewMedia =
                memory.imageDataUrl ||
                memory.mediaUrls?.[0] ||
                memory.mediaUrl ||
                null;

              return (
                <article
                  key={memory.id}
                  className={`group relative overflow-hidden rounded-3xl border bg-gray-100 text-left shadow transition ${
                    unlocked
                      ? "border-gray-200 hover:-translate-y-1"
                      : "border-gray-200 opacity-90"
                  }`}
                >
                  <div
                    className={`absolute inset-0 transition ${
                      unlocked
                        ? "bg-transparent"
                        : "bg-white/20 backdrop-blur-[2px]"
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
                        <h2 className="mt-4 line-clamp-2 text-3xl font-bold leading-tight text-gray-800">
                          {memory.title}
                        </h2>
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
                      {previewMedia ? (
                        <div className="overflow-hidden rounded-[1.5rem]">
                          <Image
                            src={previewMedia}
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
                        <div className="rounded-2xl bg-white px-5 py-8">
                          <p className="text-sm leading-7 text-gray-500">
                            {unlocked
                              ? "Ready to be opened."
                              : "Waiting quietly for its day."}
                          </p>
                        </div>
                      )}

                      <p className="mt-5 line-clamp-3 text-sm leading-7 text-gray-600">
                        {unlocked
                          ? memory.message
                          : "This memory is still tucked away. Its full message will appear when the unlock date arrives."}
                      </p>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
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
