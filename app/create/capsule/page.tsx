'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  CAPSULE_DESCRIPTION_MAX,
  CAPSULE_TITLE_MAX,
} from '@/lib/validation';

type CreatedCapsule = {
  title: string;
  description: string | null;
  submissionDeadline: string;
  unlockDate: string;
};

export default function CreateCapsulePage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientNote, setRecipientNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sharePath, setSharePath] = useState('');
  const [statusPath, setStatusPath] = useState('');
  const [createdCapsule, setCreatedCapsule] = useState<CreatedCapsule | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' && sharePath ? `${window.location.origin}${sharePath}` : '';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please log in before creating a capsule.');
      }

      const response = await fetch('/api/capsules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          submissionDeadline,
          unlockDate,
          isGift,
          recipientName: isGift ? recipientName : null,
          recipientEmail: isGift ? recipientEmail : null,
          recipientNote: isGift ? recipientNote : null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create capsule.');
      }

      setCreatedCapsule(payload.capsule);
      setSharePath(payload.sharePath);
      setStatusPath(payload.statusPath);
      setTitle('');
      setDescription('');
      setSubmissionDeadline('');
      setUnlockDate('');
      setIsGift(false);
      setRecipientName('');
      setRecipientEmail('');
      setRecipientNote('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create capsule.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (createdCapsule) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <section className="mx-auto max-w-3xl rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
            CAPSULE CREATED
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#4a3c31]">
            Your capsule is waiting.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-600">
            Send this link to contributors. They can add memories until the
            submission deadline, but the contents stay hidden until unlock day.
          </p>

          <div className="mt-7 rounded-[1.5rem] bg-white/70 p-5 text-left">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">
              {createdCapsule.title}
            </h2>
            {createdCapsule.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {createdCapsule.description}
              </p>
            ) : null}
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Submissions Close
                </dt>
                <dd className="mt-1 text-[#4a3c31]">{createdCapsule.submissionDeadline}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Unlocks
                </dt>
                <dd className="mt-1 text-[#4a3c31]">{createdCapsule.unlockDate}</dd>
              </div>
            </dl>
            <div className="mt-6 rounded-[1.5rem] border border-[#eadfce] bg-[#F5F0E6] p-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Invite people to add memories
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-600">
                Anyone with this link can add a memory until the deadline. They
                will not be able to view other submissions.
              </p>
              <button
                type="button"
                onClick={copyShareLink}
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-semibold text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
              >
                {copied ? 'Copied!' : 'Copy Share Link'}
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={statusPath}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d8cfc4] bg-white px-6 text-sm font-semibold text-[#4a3c31] shadow-sm transition hover:bg-[#f8f1e8]"
            >
              View Capsule Status
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
      <section className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
            CREATE CAPSULE
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#4a3c31]">
            Gather a chorus for later.
          </h1>
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            Invite people to leave memories now. You will be the only one who
            can reveal them when the unlock date arrives.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-[1.75rem] border border-white/70 bg-gray-100 p-8 shadow-sm sm:p-10"
        >
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium text-gray-700">TITLE</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={CAPSULE_TITLE_MAX}
                className="w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">
                DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={CAPSULE_DESCRIPTION_MAX}
                className="h-32 w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  SUBMISSION DEADLINE
                </label>
                <input
                  type="date"
                  value={submissionDeadline}
                  onChange={(event) => setSubmissionDeadline(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  UNLOCK DATE
                </label>
                <input
                  type="date"
                  value={unlockDate}
                  onChange={(event) => setUnlockDate(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  required
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-white/60 p-4">
              <label className="flex items-start gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(event) => setIsGift(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#4a3c31] focus:ring-gray-400"
                />
                <span>Send this capsule to someone else on the unlock date</span>
              </label>

              {isGift ? (
                <div className="mt-5 space-y-5">
                  <div>
                    <label className="block mb-2 font-medium text-gray-700">
                      RECIPIENT NAME
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(event) => setRecipientName(event.target.value)}
                      className="w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-gray-700">
                      RECIPIENT EMAIL
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(event) => setRecipientEmail(event.target.value)}
                      className="w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      required={isGift}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-gray-700">
                      OPTIONAL NOTE
                    </label>
                    <textarea
                      value={recipientNote}
                      onChange={(event) => setRecipientNote(event.target.value)}
                      className="h-28 w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {errorMessage ? (
              <p className="rounded-2xl bg-[#fff4dc] px-4 py-3 text-sm text-[#6c5630]">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-base font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Creating...' : 'Create Capsule'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
