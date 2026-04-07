import Link from "next/link";
import { notFound } from "next/navigation";
import MemoryPolaroid from "@/components/MemoryPolaroid";
import ProtectedMemoryGate from "@/components/ProtectedMemoryGate";
import { buildMemoryPath } from "@/lib/memories";
import {
  getSharedMemoryContent,
  getSharedMemorySummary,
} from "@/lib/serverMemories";

const NAV_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]";

function formatUnlockDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatCreatedAt(dateString: string | null) {
  if (!dateString) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

type MemoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MemoryPage({ params }: MemoryPageProps) {
  const { id } = await params;
  const memorySummary = await getSharedMemorySummary(id);

  if (!memorySummary) {
    notFound();
  }

  const createdAtLabel = formatCreatedAt(memorySummary.createdAt);
  const unlockDateLabel = formatUnlockDate(memorySummary.unlockDate);
  const unlockedMemory = memorySummary.hasPassword
    ? null
    : await getSharedMemoryContent(id);

  if (!memorySummary.hasPassword && !unlockedMemory) {
    notFound();
  }

  const visibleMemory = unlockedMemory;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-12 sm:py-16">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl bg-gray-100 p-8 shadow sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="text-sm font-semibold text-gray-500">SHARED MEMORY</span>
              <p className="max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
                Open a keepsake view of this memory and flip through its photos or videos
                inside a polaroid-style carousel.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/" className={NAV_BUTTON_CLASS}>
                Home
              </Link>
              <Link href="/timeline" className={NAV_BUTTON_CLASS}>
                Timeline
              </Link>
              <Link href={buildMemoryPath(memorySummary.id)} className={NAV_BUTTON_CLASS}>
                Refresh Link
              </Link>
            </div>
          </div>

        </header>

        {memorySummary.hasPassword ? (
          <ProtectedMemoryGate
            memoryId={memorySummary.id}
            title={memorySummary.title}
            unlockDateLabel={unlockDateLabel}
            createdAtLabel={createdAtLabel ?? "Just now"}
          />
        ) : (
          <MemoryPolaroid
            title={visibleMemory!.title}
            message={visibleMemory!.message}
            unlockDateLabel={unlockDateLabel}
            createdAtLabel={createdAtLabel ?? "Just now"}
            mediaUrls={visibleMemory!.mediaUrls}
          />
        )}
      </section>
    </main>
  );
}
