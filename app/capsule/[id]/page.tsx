import CountdownText from "@/components/CountdownText";
import UnlockCelebration from "@/components/UnlockCelebration";
import { notFound } from "next/navigation";
import { getCapsuleById, getMemoriesByCapsuleId } from "@/lib/store";

type Memory = {
  id: string;
  message: string;
  name?: string;
};

function isUnlocked(unlockDate: string) {
  return new Date(unlockDate).getTime() - Date.now() <= 0;
}

type CapsulePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CapsulePage({ params }: CapsulePageProps) {
  const { id } = await params;
  const capsule = await getCapsuleById(id);

  if (!capsule) {
    notFound();
  }

  const memories = (await getMemoriesByCapsuleId(id)).map((memory, index) => ({
    id: `${memory.capsuleId}-${index}`,
    message: memory.message,
    name: memory.name,
  })) satisfies Memory[];

  const unlocked = isUnlocked(capsule.unlockDate);

  return (
    <div className="px-6 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-6 text-sm text-gray-500 sm:mb-8">
          <CountdownText unlockDate={capsule.unlockDate} />
        </p>

        {unlocked ? (
          <UnlockCelebration memories={memories} />
        ) : (
          <p>The capsule is locked until the unlock date!</p>
        )}
      </div>
    </div>
  );
}
