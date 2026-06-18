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
  capsule_id?: string | null;
};

type Capsule = {
  id: string;
  title: string;
  submissionDeadline: string;
  unlockDate: string;
  shareSlug: string;
  createdAt: string | null;
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

function WaitingWaveCard({ label = 'Waiting to bloom' }: { label?: string }) {
  return (
    <div className="h-36 w-full overflow-hidden rounded-[1rem] border border-white/70 bg-[linear-gradient(180deg,_#f7efe4_0%,_#efe6d8_34%,_#dcecf3_70%,_#cfe3ec_100%)] shadow-sm">
      <div className="relative h-full w-full">
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,_rgba(196,223,235,0.92)_0%,_rgba(176,210,226,0.98)_100%)]" />
        <div className="absolute inset-x-[-6%] bottom-[34%] h-7 rounded-[100%] bg-white/80 blur-[0.5px]" />
        <div className="absolute inset-x-[-12%] bottom-[24%] h-11 rounded-[100%] bg-[#dceef5]/95" />
        <div className="absolute inset-x-[-10%] bottom-[15%] h-8 rounded-[100%] bg-white/88" />
        <div className="absolute inset-x-[-14%] bottom-[7%] h-10 rounded-[100%] bg-[#c8e0ea]" />
        <div className="absolute inset-x-[-8%] bottom-[1%] h-7 rounded-[100%] bg-white/72" />

        <div className="absolute inset-x-0 bottom-3 px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6f7f87]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabaseClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;

      if (!user || !session) {
        setMemories([]);
        setCapsules([]);
        setLoading(false);
        return;
      }

      const [memoryResult, capsuleResult] = await Promise.all([
        supabase
          .from('memories')
          .select('id, title, unlock_date, user_id, media_url, capsule_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        fetch('/api/capsules', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
      ]);

      if (memoryResult.error) {
        setErrorMessage('Unable to load memories');
        setMemories([]);
      } else {
        setMemories(memoryResult.data || []);
        setMemoryCount(memoryResult.data?.length || 0);
      }

      const capsulePayload = await capsuleResult.json().catch(() => null);
      setCapsules(capsulePayload?.capsules || []);

      setLoading(false);
    }

    void fetchData();
  }, []);

  async function handleConfirmDelete() {
    if (!memoryToDelete) return;

    const memory = memoryToDelete;

    try {
      setDeletingMemoryId(memory.id);

      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('Not logged in');

      setMemories((prev) => prev.filter((m) => m.id !== memory.id));

      await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      setSuccessMessage('Memory deleted');
      setMemoryToDelete(null);
    } catch (err) {
      setErrorMessage('Failed to delete memory');
    } finally {
      setDeletingMemoryId(null);
    }
  }

  // ✅ GROUP MEMORIES BY CAPSULE
  const memoriesByCapsule = memories.reduce((acc, memory) => {
    const key = memory.capsule_id || 'uncategorized';

    if (!acc[key]) acc[key] = [];
    acc[key].push(memory);

    return acc;
  }, {} as Record<string, Memory[]>);

  const totalCount = memories.length;
  const readyCount = memories.filter((m) => isReadyToUnlock(m.unlock_date)).length;
  const waitingCount = memories.length - readyCount;
  const totalItemCount = memories.length + capsules.length;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#4a3c31]">Your memories</h1>
          <p className="text-sm text-gray-600 mt-2">
            A gentle place to revisit what you left for your future self.
          </p>
        </div>

        {/* STATS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="p-6 bg-gray-100 rounded-2xl">
            <p>Total Memories</p>
            <p className="text-3xl font-bold">{totalCount}</p>
          </div>

          <div className="p-6 bg-gray-100 rounded-2xl">
            <p>Waiting</p>
            <p className="text-3xl font-bold">{waitingCount}</p>
          </div>

          <div className="p-6 bg-gray-100 rounded-2xl">
            <p>Ready</p>
            <p className="text-3xl font-bold">{readyCount}</p>
          </div>
        </div>

        {/* EMPTY STATE */}
        {!loading && totalItemCount === 0 ? (
          <div className="text-center p-10 bg-gray-100 rounded-2xl">
            No memories yet
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {/* CAPSULES */}
            {capsules.map((capsule) => {
              const capsuleMemories = memoriesByCapsule[capsule.id] || [];

              return (
                <div key={capsule.id} className="p-6 bg-gray-100 rounded-2xl">

                  <h2 className="text-xl font-semibold">{capsule.title}</h2>

                  {/* MEMORIES INSIDE CAPSULE */}
                  <div className="mt-4 space-y-3">
                    {capsuleMemories.map((memory) => (
                      <div key={memory.id} className="p-3 bg-white/70 rounded-xl">

                        <div className="flex justify-between">
                          <p className="text-sm font-medium">
                            {memory.title || 'Untitled Memory'}
                          </p>

                          <button
                            onClick={() => setMemoryToDelete(memory)}
                            className="text-xs text-red-500"
                          >
                            Delete
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                          {isReadyToUnlock(memory.unlock_date)
                            ? 'Ready'
                            : `Unlocks ${formatUnlockDate(memory.unlock_date)}`}
                        </p>

                      </div>
                    ))}
                  </div>

                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      {memoryToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl">
            <p>Delete memory?</p>

            <button onClick={() => setMemoryToDelete(null)}>
              Cancel
            </button>

            <button onClick={handleConfirmDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
    </main>
  );
}