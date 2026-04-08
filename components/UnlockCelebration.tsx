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

function getRotation(memoryId: string) {
  const rotations = [-3, -2, -1, 0, 1, 2, 3];
  const hash = Array.from(memoryId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return rotations[hash % rotations.length];
}

export default function UnlockCelebration({ memories }: UnlockCelebrationProps) {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    const audio = new Audio('/unlock.mp3');
    audio.play().catch((err) => console.log('Audio play failed:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex flex-wrap justify-center gap-6 p-6">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="w-64 transform bg-white p-4 shadow-lg"
          style={{ rotate: `${getRotation(memory.id)}deg` }}
        >
          <p className="text-gray-800">{memory.message}</p>
          <p className="mt-2 text-sm text-gray-500">- {memory.name || 'Anonymous'}</p>
        </div>
      ))}
    </div>
  );
}
