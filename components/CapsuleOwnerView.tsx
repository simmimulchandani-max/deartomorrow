'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Capsule = {
  shareSlug: string;
  title: string;
  description: string | null;
  submissionDeadline: string;
  unlockDate: string;
};

type CapsuleMemory = {
  id: string;
  contributorName: string;
  title: string;
  mediaUrls: string[];
  createdAt: string | null;
  href: string;
};

type OwnerPayload = {
  capsule: Capsule;
  unlocked: boolean;
  submissionCount: number;
  sharePath: string;
  unlockPath: string;
  memories: CapsuleMemory[];
};

function formatDate(dateString: string | null) {
  if (!dateString) return 'Unknown';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateString.slice(0, 10)}T00:00:00`));
}

function isVideo(src: string) {
  return /\.(mp4|webm|ogg|mov)$/i.test(src);
}

export default function CapsuleOwnerView({
  shareSlug,
  mode,
}: {
  shareSlug: string;
  mode: 'status' | 'unlock';
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [payload, setPayload] = useState<OwnerPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCapsule() {
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
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load capsule.');
        }

        if (isActive) {
          setPayload(data);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load capsule.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCapsule();

    return () => {
      isActive = false;
    };
  }, [shareSlug, supabase]);

  async function copyShareLink() {
    if (!payload) return;
    await navigator.clipboard.writeText(`${window.location.origin}${payload.sharePath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] bg-gray-100 p-8 text-center shadow-sm">
          <p className="text-gray-600">Loading capsule...</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] bg-gray-100 p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-[#4a3c31]">Capsule unavailable</h1>
          <p className="mt-3 text-gray-600">{errorMessage}</p>
        </div>
      </main>
    );
  }

  const { capsule, unlocked, memories } = payload;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
              CAPSULE
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-[#4a3c31]">
              {capsule.title}
            </h1>
            {capsule.description ? (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {capsule.description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold tracking-[0.12em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            {copied ? 'Link Copied' : 'Copy Share Link'}
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Submissions
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#4a3c31]">
              {payload.submissionCount}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Deadline
            </p>
            <p className="mt-3 text-2xl font-semibold text-[#4a3c31]">
              {formatDate(capsule.submissionDeadline)}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Unlock Date
            </p>
            <p className="mt-3 text-2xl font-semibold text-[#4a3c31]">
              {formatDate(capsule.unlockDate)}
            </p>
          </div>
        </div>

        {!unlocked ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">
              This capsule is still sealed.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
              You can see the capsule details and share link, but the submitted
              memories stay hidden until {formatDate(capsule.unlockDate)}.
            </p>
            <button
              type="button"
              disabled
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-400"
            >
              Not Ready Yet
            </button>
          </div>
        ) : mode === 'status' ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">
              Your capsule is ready.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
              The unlock date has arrived. Open the capsule to view the memories.
            </p>
            <Link
              href={payload.unlockPath}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
            >
              Unlock Capsule
            </Link>
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">No memories were submitted.</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              The capsule opened quietly.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {memories.map((memory) => (
              <Link
                key={memory.id}
                href={memory.href}
                className="rounded-[1.75rem] border border-white/70 bg-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                {memory.mediaUrls[0] ? (
                  <div className="mb-5 aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[#f8f1e8]">
                    {isVideo(memory.mediaUrls[0]) ? (
                      <video
                        src={memory.mediaUrls[0]}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={memory.mediaUrls[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="mb-5 flex aspect-[4/3] items-center justify-center rounded-[1.25rem] bg-[#f8f1e8] text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Memory
                  </div>
                )}
                <h2 className="text-xl font-semibold text-[#4a3c31]">{memory.title}</h2>
                <p className="mt-2 text-sm text-gray-600">From {memory.contributorName}</p>
                <p className="mt-1 text-xs text-gray-500">Saved {formatDate(memory.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
