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
    const deleteToast = window.sessionStorage.getItem('memoryDeleteToast');
    if (deleteToast) {
      setSuccessMessage(deleteToast);
      window.sessionStorage.removeItem('memoryDeleteToast');
    }

    async function fetchMemories() {
      const supabase = getSupabaseClient();
      setErrorMessage('');

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user ?? null;
        if (!user || !session) {
          setMemories([]);
          setMemoryCount(0);
          setCapsules([]);
          return;
        }

        const [memoryResult, memoryCountResult, capsuleResult] = await Promise.all([
          supabase
            .from('memories')
            .select('id, title, unlock_date, user_id, media_url, capsule_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('memories')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          fetch('/api/capsules', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);

        if (memoryResult.error) {
          console.error('Error loading memories:', memoryResult.error);
          setMemories([]);
          setErrorMessage('Unable to load timeline right now. Please refresh.');
        } else {
          const nextMemories = (memoryResult.data as Memory[]) ?? [];
          setMemories(nextMemories);
          setMemoryCount(memoryCountResult.count ?? nextMemories.length);
        }

        if (memoryCountResult.error) {
          console.error('Error loading memory count:', memoryCountResult.error);
        }

        const capsulePayload = await capsuleResult.json().catch(() => null);
        if (!capsuleResult.ok) {
          console.error('Error loading capsules:', capsulePayload?.error);
          setCapsules([]);
          setErrorMessage((current) => current || 'Unable to load timeline right now. Please refresh.');
        } else {
          setCapsules(Array.isArray(capsulePayload?.capsules) ? capsulePayload.capsules : []);
        }
      } catch (error) {
        console.error('Timeline loading error:', error);
        setMemories([]);
        setMemoryCount(0);
        setCapsules([]);
        setErrorMessage('Unable to load timeline right now. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    void fetchMemories();
  }, []);

  async function handleConfirmDelete() {
    if (!memoryToDelete) {
      return;
    }

    const memory = memoryToDelete;
    const previousMemories = memories;
    const previousCount = memoryCount;

    try {
      setDeletingMemoryId(memory.id);
      setErrorMessage('');
      setSuccessMessage('');

      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please log in before deleting this memory.');
      }

      setMemories((current) => current.filter((item) => item.id !== memory.id));
      setMemoryCount((current) => Math.max(0, current - 1));
      setMemoryToDelete(null);

      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete memory.');
      }

      setSuccessMessage('Memory deleted successfully.');
    } catch (error) {
      setMemories(previousMemories);
      setMemoryCount(previousCount);
      setMemoryToDelete(memory);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong deleting this memory.'
      );
    } finally {
      setDeletingMemoryId(null);
    }
  }

  const totalCount = memories.length;
  const readyCount = memories.filter((memory) =>
    isReadyToUnlock(memory.unlock_date)
  ).length;
  const waitingCount = memories.filter(
    (memory) => !isReadyToUnlock(memory.unlock_date)
  ).length;
  const totalItemCount = memories.length + capsules.length;

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
            href="/create/memory"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Create Memory
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Your Memories
            </p>
            <p className="mt-3 break-words text-4xl font-semibold text-[#4a3c31]">
              {loading ? '--' : `${totalCount} ${totalCount === 1 ? 'Memory' : 'Memories'}`}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {loading ? 'Counting saved memories...' : `You have ${totalCount} ${totalCount === 1 ? 'memory' : 'memories'} saved`}
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

        {errorMessage ? (
          <div className="mb-8 rounded-2xl border border-[#eadfce] bg-[#fff4dc] px-4 py-3 text-sm text-[#6c5630]">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-8 rounded-2xl border border-[#cfe4cf] bg-[#f0fff0] px-4 py-3 text-sm text-[#315f38]">
            {successMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm">
            <p className="text-gray-600">Loading your memories...</p>
          </div>
        ) : totalItemCount === 0 ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 shadow-sm sm:p-10">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7c7b6] text-3xl shadow-sm">
                🌱
              </div>

              <h2 className="text-2xl font-semibold text-[#4a3c31] sm:text-3xl">
                Nothing here yet
              </h2>

              <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                Leave something for your future self — a thought, a moment, or a
                feeling worth revisiting.
              </p>

              <div className="mx-auto mt-6 max-w-md rounded-[1.5rem] bg-white/70 p-4">
                <WaitingWaveCard label="Waiting to bloom" />
                <p className="mt-4 text-center text-xs text-gray-500">
                  Your first memory will appear here
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/create/memory"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
                >
                  Create Your First Memory
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => {
              const ready = isReadyToUnlock(memory.unlock_date);

              return (
                <div
                  key={memory.id}
                  className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="max-w-full break-words text-xl font-semibold text-[#4a3c31]">
                        {memory.title || 'Untitled Memory'}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {ready ? 'Ready to unlock' : 'Waiting to bloom'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage('');
                        setMemoryToDelete(memory);
                      }}
                      disabled={deletingMemoryId === memory.id}
                      className="shrink-0 rounded-full border border-red-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4">
                    <WaitingWaveCard
                      label={ready ? 'Ready to bloom' : 'Waiting to bloom'}
                    />
                    <p className="mt-4 text-center text-xs text-gray-500">
                      Unlocks {formatUnlockDate(memory.unlock_date)}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
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
            })}

            {capsules.map((capsule) => {
              const ready = isReadyToUnlock(capsule.unlockDate);
              const href = ready
                ? `/capsule/${capsule.shareSlug}/unlock`
                : `/capsule/${capsule.shareSlug}/status`;

              return (
                <div
                  key={capsule.id}
                  className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm"
                >
                  <div>
                    <div className="mb-3 inline-flex rounded-full border border-[#e7b6a4] bg-[#f7c7b6]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4a3c31]">
                      Capsule
                    </div>
                    <h2 className="max-w-full break-words text-xl font-semibold text-[#4a3c31]">
                      {capsule.title || 'Untitled Capsule'}
                    </h2>
                    <p className="mt-1 max-w-full break-words text-sm text-gray-500">
                      {ready ? 'Ready to open' : `Locked until ${formatUnlockDate(capsule.unlockDate)}`}
                    </p>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4">
                    <WaitingWaveCard
                      label={ready ? 'Ready to open' : 'Capsule sealed'}
                    />
                    <div className="mt-4 space-y-1 text-center text-xs text-gray-500">
                      <p>Unlocks {formatUnlockDate(capsule.unlockDate)}</p>
                      <p>Submissions close {formatUnlockDate(capsule.submissionDeadline)}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={href}
                      className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border px-5 text-sm font-semibold transition ${
                        ready
                          ? 'border-[#e7b6a4] bg-[#f7c7b6] text-[#4a3c31] hover:bg-[#f4bba8]'
                          : 'border-[#d8cfc4] bg-white text-[#4a3c31] hover:bg-[#f8f1e8]'
                      }`}
                    >
                      {ready ? 'Open Capsule' : 'View Status'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {memoryToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4a3c31]/45 px-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#F5F0E6] p-6 text-center shadow-[0_24px_80px_rgba(74,60,49,0.28)] sm:p-7">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">
              Delete Memory?
            </h2>

            <p className="mt-3 max-w-full break-words text-sm leading-7 text-[#6b5a4f] sm:text-base">
              This action cannot be undone. This memory and all associated media will be permanently deleted.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setMemoryToDelete(null)}
                disabled={Boolean(deletingMemoryId)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8cfc4] bg-white px-5 text-sm font-semibold tracking-[0.08em] text-[#4a3c31] shadow-sm transition hover:bg-[#f8f1e8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingMemoryId)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-300 bg-red-400 px-5 text-sm font-semibold tracking-[0.08em] text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingMemoryId ? 'Deleting...' : 'Delete Memory'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
