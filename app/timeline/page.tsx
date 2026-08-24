'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { hasDateArrived } from '@/lib/unlockDates';

type Memory = {
  id: string;
  title: string;
  unlock_date: string;
  created_at: string | null;
  preview_url?: string | null;
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

function isReadyToUnlock(unlockDate: string | null) {
  return hasDateArrived(unlockDate);
}

function isLocked(unlockDate: string | null) {
  return !isReadyToUnlock(unlockDate);
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

function TimelinePreview({
  locked,
  mediaUrl,
  label,
}: {
  locked?: boolean;
  mediaUrl?: string | null;
  label: string;
}) {
  const previewUrl = locked ? null : mediaUrl;

  return (
    <div className="rounded-[1.5rem] bg-white/70 p-4">
      {previewUrl ? (
        <div className="h-36 w-full overflow-hidden rounded-[1rem] border border-white/70 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-full w-full scale-105 object-cover blur-sm" />
        </div>
      ) : (
        <WaitingWaveCard label={label} />
      )}
    </div>
  );
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
    const toast =
      window.sessionStorage.getItem('capsuleDeleteToast') ??
      window.sessionStorage.getItem('memoryDeleteToast');
    if (toast) {
      setSuccessMessage(toast);
      window.sessionStorage.removeItem('capsuleDeleteToast');
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
            .select('id, title, unlock_date, created_at, user_id')
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

        const memoryRows = (memoryResult.data as Memory[]) ?? [];
        const previewResponse = await fetch('/api/memories/media-previews', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: memoryRows
              .filter((memory) => isReadyToUnlock(memory.unlock_date))
              .map((memory) => memory.id),
          }),
        });
        const previewPayload = await previewResponse.json().catch(() => null);
        const previews = previewResponse.ok && previewPayload?.previews ? previewPayload.previews : {};

        const capsulePayload = await capsuleResult.json().catch(() => null);

        if (!capsuleResult.ok) {
          throw new Error(capsulePayload?.error || 'Failed to load capsules.');
        }

        setMemories(memoryRows.map((memory) => ({ ...memory, preview_url: previews[memory.id] ?? null })));
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
                    const locked = isLocked(memory.unlock_date);
                    const ready = !locked;
                    const preview = ready ? memory.preview_url : null;

                    return (
                      <article key={memory.id} className="overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
                        <div className="px-6 pt-6">
                          <TimelinePreview
                            locked={locked}
                            mediaUrl={preview}
                            label={ready ? 'Ready to bloom' : 'Waiting to bloom'}
                          />
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
                        <div className="px-6 pt-6">
                          <TimelinePreview
                            locked={!ready}
                            label={ready ? 'Ready to bloom' : 'Waiting to bloom'}
                          />
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
