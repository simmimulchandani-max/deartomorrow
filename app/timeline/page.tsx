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
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
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
          setCapsules([]);
          return;
        }

        const [memoryResult, capsuleResult] = await Promise.all([
          supabase
            .from('memories')
            .select('id, title, unlock_date, user_id, media_url')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
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
          setMemories((memoryResult.data as Memory[]) ?? []);
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
        setCapsules([]);
        setErrorMessage('Unable to load timeline right now. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    void fetchMemories();
  }, []);

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

        {errorMessage ? (
          <div className="mb-8 rounded-2xl border border-[#eadfce] bg-[#fff4dc] px-4 py-3 text-sm text-[#6c5630]">
            {errorMessage}
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
                  <div>
                    <h2 className="text-xl font-semibold text-[#4a3c31]">
                      {memory.title || 'Untitled Memory'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {ready ? 'Ready to unlock' : 'Waiting to bloom'}
                    </p>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4">
                    <WaitingWaveCard
                      label={ready ? 'Ready to bloom' : 'Waiting to bloom'}
                    />
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
                    <h2 className="text-xl font-semibold text-[#4a3c31]">
                      {capsule.title || 'Untitled Capsule'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
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
    </main>
  );
}
