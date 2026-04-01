// File: components/UnlockCelebration.tsx
'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

type Memory = {
  id: string;
  message: string;
  name?: string;
};

interface UnlockCelebrationProps {
  memories: Memory[];
}

export default function UnlockCelebration({ memories }: UnlockCelebrationProps) {
  useEffect(() => {
    // Fire confetti once on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Play unlock sound
    const audio = new Audio('/unlock.mp3'); // ensure file is in /public
    audio.play().catch((err) => console.log('Audio play failed:', err));
  }, []);

  // Generate a random rotation for each card
  const getRotation = () => {
    const rotations = [-3, -2, -1, 0, 1, 2, 3];
    return rotations[Math.floor(Math.random() * rotations.length)];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex flex-wrap justify-center gap-6 p-6">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className={`bg-white p-4 shadow-lg w-64 transform`}
          style={{ rotate: `${getRotation()}deg` }}
        >
          <p className="text-gray-800">{memory.message}</p>
          <p className="text-sm text-gray-500 mt-2">— {memory.name || 'Anonymous'}</p>
        </div>
      ))}
    </div>
  );
}