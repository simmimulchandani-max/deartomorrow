'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Memory = {
  id: string;
  title: string;
  message: string;
  created_at: string | null;
  capsule_id: string;
  media_urls?: string[];
  user_id?: string;
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

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);

  useEffect(() => {
    const toast = window.sessionStorage.getItem('memoryDeleteToast');
    if (toast) {
      setSuccessMessage(toast);
      window.sessionStorage.removeItem('memoryDeleteToast');
    }

    async function fetchData() {
      const supabase = getSupabaseClient();

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setMemories([]);
          setCapsules([]);
          setLoading(false);
          return;
        }

        const [memoryResult, capsuleResult] = await Promise.all([
          supabase
            .from('capsule_memories')
            .select('id, title, message, created_at, capsule_id, media_urls, user_id')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),

          fetch('/api/capsules', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);

        if (!memoryResult.error) {
          setMemories((memoryResult.data as Memory[]) ?? []);
        }

        const capsulePayload = await capsuleResult.json().catch(() => null);

        setCapsules(capsulePayload?.capsules ?? []);
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to load timeline.');
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  async function handleConfirmDelete() {
    if (!memoryToDelete) return;

    try {
      setDeletingMemoryId(memoryToDelete.id);

      const supabase = getSupabaseClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      // optimistic UI update
      setMemories((prev) =>
        prev.filter((m) => m.id !== memoryToDelete.id)
      );

      await fetch(
        `/api/capsules/${memoryToDelete.capsule_id}/memories/${memoryToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      setMemoryToDelete(null);
      setSuccessMessage('Memory deleted');
    } catch (e) {
      setErrorMessage('Delete failed');
    } finally {
      setDeletingMemoryId(null);
    }
  }

  const totalCount = memories.length;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex items-end justify-between">
          <h1 className="text-4xl font-bold text-[#4a3c31]">
            Your memories
          </h1>

          <Link
            href="/create/memory"
            className="rounded-full bg-[#f7c7b6] px-6 py-3 text-sm font-semibold"
          >
            Create Memory
          </Link>
        </div>

        {/* COUNTERS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gray-100 p-6">
            <p>Memories</p>
            <p className="text-3xl font-bold">{totalCount}</p>
          </div>

          <div className="rounded-2xl bg-gray-100 p-6">
            <p>Ready</p>
            <p className="text-3xl font-bold">
              {memories.filter((m) => isReadyToUnlock(null)).length}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-100 p-6">
            <p>Capsules</p>
            <p className="text-3xl font-bold">{capsules.length}</p>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {capsules.map((capsule) => {
              const capsuleMemories = memories.filter(
                (m) => m.capsule_id === capsule.id
              );

              return (
                <div
                  key={capsule.id}
                  className="rounded-2xl bg-gray-100 p-6"
                >
                  <h2 className="text-xl font-semibold">
                    {capsule.title}
                  </h2>

                  <div className="mt-4 space-y-3">
                    {capsuleMemories.map((memory) => (
                      <div
                        key={memory.id}
                        className="flex items-center justify-between rounded-xl bg-white p-3"
                      >
                        <p className="text-sm">
                          {memory.title || 'Untitled Memory'}
                        </p>

                        <button
                          onClick={() => setMemoryToDelete(memory)}
                          className="text-xs text-red-500"
                        >
                          Delete
                        </button>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6">
            <p className="mb-4">Delete memory?</p>

            <div className="flex gap-3">
              <button
                onClick={() => setMemoryToDelete(null)}
                className="rounded bg-gray-200 px-4 py-2"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={deletingMemoryId === memoryToDelete.id}
                className="rounded bg-red-500 px-4 py-2 text-white"
              >
                {deletingMemoryId === memoryToDelete.id
                  ? 'Deleting...'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}