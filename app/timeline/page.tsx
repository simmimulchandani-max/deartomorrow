'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Memory = {
  id: string;
  title: string;
  message: string;
  unlock_date: string;
  created_at: string | null;
  media_urls?: string[] | null;
  user_id?: string;
};

type Capsule = {
  id: string;
  title: string;
  description: string | null;
  submissionDeadline: string;
  unlockDate: string;
  shareSlug: string;
  createdAt: string | null;
};

function dateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function isReadyToUnlock(unlockDate: string | null) {
  return Boolean(unlockDate && unlockDate <= dateOnly());
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Just now';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatSavedDate(dateString: string | null) {
  if (!dateString) return 'Just now';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

function statusLabel(unlockDate: string) {
  return isReadyToUnlock(unlockDate) ? 'Ready to open' : `Unlocks ${formatDate(unlockDate)}`;
}

function firstMediaUrl(memory: Memory) {
  return Array.isArray(memory.media_urls) ? memory.media_urls[0] : null;
}

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);

  const readyMemoryCount = useMemo(
    () => memories.filter((memory) => isReadyToUnlock(memory.unlock_date)).length,
    [memories]
  );

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
            .from('memories')
            .select('id, title, message, unlock_date, created_at, media_urls, user_id')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),
          fetch('/api/capsules', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);

        if (memoryResult.error) {
          throw new Error(memoryResult.error.message);
        }

        const capsulePayload = await capsuleResult.json().catch(() => null);

        if (!capsuleResult.ok) {
          throw new Error(capsulePayload?.error || 'Failed to load capsules.');
        }

        setMemories((memoryResult.data as Memory[]) ?? []);
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

      if (!session) {
        throw new Error('Please log in before deleting this memory.');
      }

      const response = await fetch(`/api/memories/${memoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Delete failed.');
      }

      setMemories((prev) => prev.filter((memory) => memory.id !== memoryToDelete.id));
      setMemoryToDelete(null);
      setSuccessMessage('Memory deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setDeletingMemoryId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-5 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">TIMELINE</p>
            <h1 className="mt-2 text-4xl font-bold text-[#4a3c31]">Your memories</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/create/memory"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
            >
              Create Memory
            </Link>
            <Link
              href="/create/capsule"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gray-100 px-5 text-sm font-semibold text-[#4a3c31] shadow transition hover:bg-white"
            >
              Create Capsule
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gray-100 p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Memories</p>
            <p className="mt-2 text-3xl font-bold text-[#4a3c31]">{memories.length}</p>
          </div>

          <div className="rounded-2xl bg-gray-100 p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Ready</p>
            <p className="mt-2 text-3xl font-bold text-[#4a3c31]">{readyMemoryCount}</p>
          </div>

          <div className="rounded-2xl bg-gray-100 p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Capsules</p>
            <p className="mt-2 text-3xl font-bold text-[#4a3c31]">{capsules.length}</p>
          </div>
        </div>

        {successMessage ? (
          <p className="mb-6 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#4a3c31] shadow-sm">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mb-6 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-red-600 shadow-sm">
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="rounded-2xl bg-gray-100 p-6 text-gray-600 shadow-sm">Loading timeline...</p>
        ) : memories.length === 0 && capsules.length === 0 ? (
          <section className="rounded-2xl bg-gray-100 p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">Nothing here yet</h2>
            <p className="mt-3 text-gray-600">Create a memory or capsule to start your timeline.</p>
          </section>
        ) : (
          <div className="space-y-10">
            {memories.length > 0 ? (
              <section>
                <h2 className="mb-4 text-2xl font-semibold text-[#4a3c31]">Standalone memories</h2>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {memories.map((memory) => {
                    const ready = isReadyToUnlock(memory.unlock_date);
                    const preview = firstMediaUrl(memory);

                    return (
                      <article key={memory.id} className="overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
                        <div className="relative h-32 bg-[#4a3c31]">
                          <div className="absolute inset-x-0 bottom-0 h-16 rounded-t-[50%] bg-[#f7c7b6]" />
                          <div className="absolute inset-x-8 bottom-5 h-10 rounded-t-[50%] bg-[#F5F0E6]" />
                          {preview ? (
                            <div className="absolute right-5 top-5 h-20 w-20 overflow-hidden rounded-xl bg-white shadow">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={preview} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : null}
                        </div>

                        <div className="p-6">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 break-words text-xl font-semibold text-[#4a3c31]">
                              {memory.title || 'Untitled Memory'}
                            </h3>
                            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4a3c31]">
                              {ready ? 'Ready' : 'Locked'}
                            </span>
                          </div>

                          <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                            {memory.message}
                          </p>

                          <p className="mt-4 text-sm font-medium text-[#4a3c31]">{statusLabel(memory.unlock_date)}</p>
                          <p className="mt-1 text-xs text-gray-500">Saved {formatSavedDate(memory.created_at)}</p>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                              href={`/memory/${memory.id}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f7c7b6] px-4 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]"
                            >
                              {ready ? 'Open' : 'View'}
                            </Link>
                            <button
                              type="button"
                              onClick={() => setMemoryToDelete(memory)}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {capsules.length > 0 ? (
              <section>
                <h2 className="mb-4 text-2xl font-semibold text-[#4a3c31]">Capsules</h2>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {capsules.map((capsule) => {
                    const ready = isReadyToUnlock(capsule.unlockDate);

                    return (
                      <article key={capsule.id} className="overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
                        <div className="relative h-32 bg-[#4a3c31]">
                          <div className="absolute inset-x-0 bottom-0 h-16 rounded-t-[50%] bg-[#f7c7b6]" />
                          <div className="absolute inset-x-8 bottom-5 h-10 rounded-t-[50%] bg-[#F5F0E6]" />
                        </div>

                        <div className="p-6">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 break-words text-xl font-semibold text-[#4a3c31]">
                              {capsule.title}
                            </h3>
                            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4a3c31]">
                              {ready ? 'Ready' : 'Locked'}
                            </span>
                          </div>

                          {capsule.description ? (
                            <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                              {capsule.description}
                            </p>
                          ) : null}

                          <p className="mt-4 text-sm font-medium text-[#4a3c31]">{statusLabel(capsule.unlockDate)}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Submissions close {formatDate(capsule.submissionDeadline)}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                              href={`/capsule/${capsule.shareSlug}/status`}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f7c7b6] px-4 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]"
                            >
                              Manage
                            </Link>
                            <Link
                              href={`/capsule/${capsule.shareSlug}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#4a3c31] transition hover:bg-white/80"
                            >
                              Share
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {memoryToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="text-xl font-semibold text-[#4a3c31]">Delete memory?</h2>
            <p className="mt-2 text-sm text-gray-600">This cannot be undone.</p>

            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setMemoryToDelete(null)}
                disabled={deletingMemoryId === memoryToDelete.id}
                className="rounded-full bg-gray-200 px-4 py-2 text-[#4a3c31]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingMemoryId === memoryToDelete.id}
                className="rounded-full bg-red-500 px-4 py-2 text-white disabled:opacity-60"
              >
                {deletingMemoryId === memoryToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
