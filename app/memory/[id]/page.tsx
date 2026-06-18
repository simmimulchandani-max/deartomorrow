import { notFound } from "next/navigation";
import MemoryPolaroid from "@/components/MemoryPolaroid";
import ProtectedMemoryGate from "@/components/ProtectedMemoryGate";
import {
  getSharedMemoryContent,
  getSharedMemorySummary,
} from "@/lib/serverMemories";
import { dateOnly } from "@/lib/validation";

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
  const isReady = memorySummary.unlockDate <= dateOnly(new Date());

  if (!isReady) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
            LOCKED MEMORY
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#4a3c31] sm:text-4xl">
            {memorySummary.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            This memory is still waiting. It opens on {unlockDateLabel}.
          </p>
        </section>
      </main>
    );
  }

  const unlockedMemory = memorySummary.hasPassword
    ? null
    : await getSharedMemoryContent(id);

  if (!memorySummary.hasPassword && !unlockedMemory) {
    notFound();
  }

  const visibleMemory = unlockedMemory;

  return (
    <main className="min-h-screen bg-[#F5F0E6]">
      {memorySummary.hasPassword ? (
        <ProtectedMemoryGate
          memoryId={memorySummary.id}
          ownerUserId={memorySummary.userId}
          title={memorySummary.title}
          unlockDateLabel={unlockDateLabel}
          createdAtLabel={createdAtLabel ?? "Just now"}
        />
      ) : (
        <MemoryPolaroid
          memoryId={memorySummary.id}
          ownerUserId={visibleMemory!.userId}
          title={visibleMemory!.title}
          message={visibleMemory!.message}
          unlockDateLabel={unlockDateLabel}
          createdAtLabel={createdAtLabel ?? "Just now"}
          mediaUrls={visibleMemory!.mediaUrls}
        />
      )}
    </main>
  );
}
