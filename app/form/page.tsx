// File: app/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateCapsulePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [media, setMedia] = useState<FileList | null>(null);
  const [unlockDate, setUnlockDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('text', text);
      formData.append('unlockDate', unlockDate);

      if (media) {
        Array.from(media).forEach((file) =>
          formData.append('media', file)
        );
      }

      const res = await fetch('/api/capsules', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.error('Failed to create capsule');
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      router.push('/timeline');
    } catch (error) {
      console.error('Error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-deartomorrow-bg flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-deartomorrow-card rounded-2xl shadow-lg p-8 space-y-6">
        {/* Title */}
        <h1 className="text-3xl font-bold text-deartomorrow-primary text-center">
          Create a Capsule
        </h1>

        {/* Nav Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-deartomorrow-secondary hover:underline"
          >
            Home
          </button>
          <button
            onClick={() => router.push('/timeline')}
            className="text-deartomorrow-secondary hover:underline"
          >
            Timeline
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-deartomorrow-label font-medium">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name your capsule"
              className="border border-deartomorrow-border rounded-lg px-3 py-2 focus:outline-none focus:ring-deartomorrow-focus"
              required
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1">
            <label className="text-deartomorrow-label font-medium">
              Message
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write something heartfelt…"
              className="border border-deartomorrow-border rounded-lg px-3 py-3 focus:outline-none focus:ring-deartomorrow-focus resize-none"
              rows={4}
              required
            />
          </div>

          {/* Media Upload */}
          <div className="flex flex-col gap-1">
            <label className="text-deartomorrow-label font-medium">
              Photos or Videos
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setMedia(e.target.files)}
              className="text-deartomorrow-text"
            />
          </div>

          {/* Unlock Date */}
          <div className="flex flex-col gap-1">
            <label className="text-deartomorrow-label font-medium">
              Unlock Date
            </label>
            <input
              type="date"
              value={unlockDate}
              onChange={(e) =>
                setUnlockDate(e.target.value)
              }
              className="border border-deartomorrow-border rounded-lg px-3 py-2 focus:outline-none focus:ring-deartomorrow-focus"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-deartomorrow-primary text-white font-semibold py-2 rounded-xl hover:bg-deartomorrow-primary-dark transition"
          >
            {isSubmitting ? 'Creating…' : 'Create Capsule'}
          </button>
        </form>
      </div>
    </div>
  );
}