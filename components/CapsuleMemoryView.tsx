'use client';

import { useEffect, useMemo, useState } from 'react';
import MemoryPolaroid from '@/components/MemoryPolaroid';
import { getSupabaseClient } from '@/lib/supabaseClient';

type CapsuleMemory = {
  id: string;
  contributorName: string;
  title: string;
  message: string;
  mediaUrls: string[];
  createdAt: string | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return 'Just now';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatUnlockDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateString}T00:00:00`));
}

export default function CapsuleMemoryView({
  shareSlug,
  memoryId,
}: {
  shareSlug: string;
  memoryId: string;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [memory, setMemory] = useState<CapsuleMemory | null>(null);
  const [unlockDate, setUnlockDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadMemory() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Please log in as the capsule owner.');
        }

        const response = await fetch(`/api/capsules/${shareSlug}/owner`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load capsule memory.');
        }

        if (!payload.unlocked) {
          throw new Error('This capsule is not ready to unlock yet.');
        }

        const foundMemory = Array.isArray(payload.memories)
          ? payload.memories.find((item: CapsuleMemory) => item.id === memoryId)
          : null;

        if (!foundMemory) {
          throw new Error('Memory not found.');
        }

        if (isActive) {
          setMemory(foundMemory);
          setUnlockDate(payload.capsule.unlockDate);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load capsule memory.'
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadMemory();

    return () => {
      isActive = false;
    };
  }, [memoryId, shareSlug, supabase]);

  async function handleDelete() {
    if (!memory) return;

    try {
      const res = await fetch(
        `/api/capsules/${shareSlug}/memories/${memory.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete memory');
      }

      setMemory(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete memory'
      );
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] bg-gray-100 p-8 text-center shadow-sm">
          <p className="text-gray-600">Opening memory...</p>
        </div>
      </main>
    );
  }

  if (!memory || !unlockDate) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] bg-gray-100 p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-[#4a3c31]">
            Memory unavailable
          </h1>
          <p className="mt-3 text-gray-600">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <MemoryPolaroid
      memoryId={memory.id}
      title={memory.title}
      message={`${memory.message}\n\n- ${memory.contributorName}`}
      unlockDateLabel={formatUnlockDate(unlockDate)}
      createdAtLabel={formatDate(memory.createdAt)}
      mediaUrls={memory.mediaUrls}
      sharePath={`/capsule/${shareSlug}/memory/${memory.id}`}
      showDeleteButton
      onDelete={handleDelete}
    />
  );
}
