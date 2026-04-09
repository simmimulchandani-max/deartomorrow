'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { buildMemoryPath } from '@/lib/memoryPaths';

type Memory = {
  id: string;
  title: string | null;
  unlock_date: string | null;
  user_id: string | null;
  media_url?: string | null;
};

function isReadyToUnlock(unlockDate: string | null) {
  if (!unlockDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unlock = new Date(`${unlockDate}T00:00:00`);
  return unlock <= today;
}

function formatUnlockDate(unlockDate: string | null) {
  if (!unlockDate) return 'No unlock date';

  const date = new Date(`${unlockDate}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMemories() {
      const supabase = getSupabaseClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Unable to get logged in user:', userError);
        setMemories([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('memories')
        .select('id, title, unlock_date, user_id, media_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading memories:', error);
        setMemories([]);
        setLoading(false);
        return;
      }

      setMemories((data as Memory[]) ?? []);
      setLoading(false);
    }

    fetchMemories();
  }, []);

  const totalCount = memories.length;
  const readyCount = memories.filter((memory) =>
    isReadyToUnlock(memory.unlock_date)
  ).length;
  const waitingCount = memories.filter(
    (memory) => !isReadyToUnlock(memory.unlock_date)
  ).length;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
              TIMELINE
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-[#4a3c31]">
              Your memories
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-600">
              A gentle place to revisit what you left for your future self.
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Create Memory
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Total Memories
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {loading ? '--' : totalCount}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Waiting
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {loading ? '--' : waitingCount}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Ready
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {loading ? '--' : readyCount}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm">
            <p className="text-gray-600">Loading your memories...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {memories.length === 0 ? (
              <>
                {[1, 2, 3].map((card) => (
                  <div
                    key={card}
                    className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-[#4a3c31]">
                          Your first memory
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Create something for your future self
                        </p>
                      </div>

                      <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-[#4a3c31] shadow-sm">
                        0
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4">
                      <div className="mx-auto flex h-36 w-28 items-center justify-center rounded-[1rem] border border-white/70 bg-[linear-gradient(180deg,_#f7efe4_0%,_#efe6d8_52%,_#d8e8ef_100%)] shadow-sm">
                        <div className="text-center">
                          <div className="mx-auto h-10 w-10 rounded-full bg-white/70" />
                          <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                            Waiting to bloom
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-center text-xs text-gray-500">
                        Nothing planted yet
                      </p>
                    </div>

                    <div className="mt-5">
                      <Link
                        href="/create"
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]"
                      >
                        Create Memory
                      </Link>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              memories.map((memory, index) => {
                const ready = isReadyToUnlock(memory.unlock_date);

                return (
                  <div
                    key={memory.id}
                    className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-[#4a3c31]">
                          {memory.title || 'Untitled Memory'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          {ready ? 'Ready to unlock' : 'Waiting to bloom'}
                        </p>
                      </div>

                      <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-[#4a3c31] shadow-sm">
                        {index + 1}
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4">
                      <div className="mx-auto flex h-36 w-28 items-center justify-center rounded-[1rem] border border-white/70 bg-[linear-gradient(180deg,_#f7efe4_0%,_#efe6d8_45%,_#d7e8ef_100%)] shadow-sm">
                        <div className="text-center px-3">
                          <div className="mx-auto h-10 w-10 rounded-full bg-white/70" />
                          <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                            Waiting to bloom
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-center text-xs text-gray-500">
                        Unlocks {formatUnlockDate(memory.unlock_date)}
                      </p>
                    </div>

                    <div className="mt-5">
                      {ready ? (
                        <Link
                          href={buildMemoryPath(memory.id)}
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]"
                        >
                          Unlock
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-400"
                        >
                          Not ready yet
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}