'use client';
type Memory = {
  id: string;
  message: string;
  name?: string;
};
import UnlockCelebration from '@/components/UnlockCelebration';

export default function CapsulePage({ memories, unlocked }: { memories: Memory[], unlocked: boolean }) {
  return (
    <div>
      {unlocked ? (
        <UnlockCelebration memories={memories} />
      ) : (
        <p>The capsule is locked until the unlock date!</p>
      )}
    </div>
  );
}