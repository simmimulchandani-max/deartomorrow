'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseClient } from '../../lib/supabaseClient';

type Memory = {
  id: string;
  title: string | null;
  unlock_date?: string | null;
  user_id?: string | null;
  media_url?: string | null;
};

function isReadyToUnlock(unlockDate?: string | null) {
  if (!unlockDate) return false;

  const today = new Date();
  const unlock = new Date(`${unlockDate}T00:00:00`);

  return unlock <= today;
}

export default function Timeline() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMemories() {
      const supabase = getSupabaseClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        setMemories([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('memories')
        .select('id, title, unlock_date, user_id, media_url')
        .eq('user_id', user.id)
        .order('unlock_date', { ascending: true });

      if (error) {
        console.error(error);
        setMemories([]);
        setIsLoading(false);
        return;
      }

      setMemories((data as Memory[]) || []);
      setIsLoading(false);
    }

    fetchMemories();
  }, []);

  const totalCount = memories.length;
  const waitingCount = memories.filter((m) => !isReadyToUnlock(m.unlock_date)).length;
  const openedCount = memories.filter((m) => isReadyToUnlock(m.unlock_date)).length;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-[#4a3c31]">Timeline</h1>
            <p className="mt-2 max-w-xl text-sm text-[#6f6258]">
              A quiet place for the memories you’ve left for your future self.
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] transition hover:bg-[#f4bba8]"
          >
            Create Memory
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Total Memories
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {isLoading ? '--' : totalCount}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Waiting
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {isLoading ? '--' : waitingCount}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Ready to Unlock
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {isLoading ? '--' : openedCount}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 shadow-sm">
              <p className="text-sm text-gray-600">Loading your memories...</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Waiting to bloom
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#4a3c31]">
                Your first memory will appear here
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Create a memory and it will show up here with its unlock timing.
              </p>
              <Link
                href="/create"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]"
              >
                Create your first memory
              </Link>
            </div>
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
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Memory {index + 1}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[#4a3c31]">
                        {memory.title || 'Untitled Memory'}
                      </h2>
                    </div>

                    <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-[#4a3c31] shadow-sm">
                      {index + 1}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4">
                    <div className="relative mx-auto h-32 w-24 overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm">
                      <Image
                        src="/waiting-to-bloom.png"
                        alt="Waiting to bloom"
                        fill
                        className="object-cover"
                      />
                    </div>

                    <p className="mt-4 text-center text-sm font-medium text-gray-600">
                      {ready ? 'Ready to unlock' : 'Waiting to bloom'}
                    </p>

                    <p className="mt-2 text-center text-xs text-gray-500">
                      {memory.unlock_date
                        ? `Unlocks on ${memory.unlock_date}`
                        : 'No unlock date set'}
                    </p>
                  </div>

                  <div className="mt-5">
                    {ready ? (
                      <Link
                        href={`/memory/${memory.id}`}
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
      </div>
    </main>
  );
}