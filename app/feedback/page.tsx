'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

const FEEDBACK_RATINGS = ['\u{1F642}', '\u{1F610}', '\u{1F621}'] as const;

async function uploadFeedbackScreenshot(screenshot: File, accessToken: string) {
  const targetResponse = await fetch('/api/feedback/upload-target', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: {
        name: screenshot.name,
        type: screenshot.type,
        size: screenshot.size,
      },
    }),
  });
  const targetPayload = (await targetResponse.json().catch(() => null)) as {
    error?: string;
    signedUrl?: string;
    publicUrl?: string;
    contentType?: string;
  } | null;

  if (!targetResponse.ok || !targetPayload?.signedUrl) {
    throw new Error(targetPayload?.error ?? 'Could not prepare screenshot upload.');
  }

  const uploadResponse = await fetch(targetPayload.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': targetPayload.contentType || screenshot.type || 'image/png',
    },
    body: screenshot,
  });

  if (!uploadResponse.ok) {
    throw new Error('Screenshot upload failed.');
  }

  return targetPayload.publicUrl ?? null;
}

export default function FeedbackPage() {
  const [rating, setRating] = useState<(typeof FEEDBACK_RATINGS)[number]>('\u{1F642}');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    const supabase = getSupabaseClient();

    async function loadEmail() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isActive) {
        setEmail(user?.email ?? '');
      }
    }

    void loadEmail();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('');
    setErrorMessage('');

    const trimmedEmail = email.trim();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedEmail || !trimmedTitle || !trimmedDescription) {
      setErrorMessage('Email, title, and description are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error('Please log in again before sending feedback.');
      }

      const screenshotUrl = screenshot
        ? await uploadFeedbackScreenshot(screenshot, session.access_token)
        : null;

      const { error } = await supabase.from('feedback').insert({
        user_id: session.user.id,
        email: trimmedEmail,
        title: trimmedTitle,
        description: trimmedDescription,
        rating,
        screenshot_url: screenshotUrl,
      });

      if (error) {
        throw error;
      }

      setStatus('Feedback sent. Thank you.');
      setTitle('');
      setDescription('');
      setScreenshot(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Feedback could not be sent. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-10 text-[#4a3c31]">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-lg rounded-[2rem] border border-[#eadfce] bg-[#F5F0E6] p-5 shadow-[0_24px_60px_rgba(74,60,49,0.18)]"
      >
        <div>
          <h1 className="text-2xl font-semibold text-[#4a3c31]">Send feedback</h1>
          <p className="mt-1 text-sm text-[#6f6259]">Tell us what happened.</p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-[#4a3c31]">Rating</p>
          <div className="mt-2 flex gap-2">
            {FEEDBACK_RATINGS.map((ratingOption) => (
              <button
                key={ratingOption}
                type="button"
                onClick={() => setRating(ratingOption)}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-2xl transition ${
                  rating === ratingOption
                    ? 'border-[#e7b6a4] bg-[#f7c7b6]'
                    : 'border-[#ded7cd] bg-white hover:bg-[#fffaf2]'
                }`}
                aria-label={`Rate ${ratingOption}`}
                aria-pressed={rating === ratingOption}
              >
                {ratingOption}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block text-sm font-semibold text-[#4a3c31]">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-[#ded7cd] bg-white px-4 text-base font-normal text-[#4a3c31] outline-none focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-[#4a3c31]">
          Title
          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-[#ded7cd] bg-white px-4 text-base font-normal text-[#4a3c31] outline-none focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-[#4a3c31]">
          Description
          <textarea
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            className="mt-2 w-full resize-y rounded-2xl border border-[#ded7cd] bg-white px-4 py-3 text-base font-normal text-[#4a3c31] outline-none focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
          />
        </label>

        <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#ded7cd] bg-white px-5 py-3 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#fffaf2]">
          Upload screenshot
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}
          />
        </label>
        {screenshot ? (
          <p className="mt-2 truncate text-sm text-[#6f6259]">{screenshot.name}</p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-[#e7b6a4] bg-white px-4 py-3 text-sm text-[#9b4d3a]">
            {errorMessage}
          </p>
        ) : null}

        {status ? (
          <p className="mt-4 rounded-2xl border border-[#ded7cd] bg-white px-4 py-3 text-sm text-[#4a3c31]">
            {status}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-bold uppercase tracking-[0.16em] text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Sending...' : 'Submit feedback'}
        </button>
      </form>
    </main>
  );
}
