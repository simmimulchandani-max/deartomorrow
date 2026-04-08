import { notFound } from "next/navigation";
import MemoryPolaroid from "@/components/MemoryPolaroid";
import ProtectedMemoryGate from "@/components/ProtectedMemoryGate";
import {
  getSharedMemoryContent,
  getSharedMemorySummary,
} from "@/lib/serverMemories";

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
    <main className="min-h-screen bg-[#F5F0E6]">
      {memorySummary.hasPassword ? (
        <ProtectedMemoryGate
          memoryId={memorySummary.id}
          title={memorySummary.title}
          unlockDateLabel={unlockDateLabel}
          createdAtLabel={createdAtLabel ?? "Just now"}
        />
      ) : (
        <MemoryPolaroid
          memoryId={memorySummary.id}
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
