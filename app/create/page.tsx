'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { buildMemoryPath } from '@/lib/memories';
import { getSupabaseClient } from '@/lib/supabaseClient';

const STORAGE_KEY = 'dear-tomorrow-memories';
const SUPABASE_STORAGE_BUCKET = 'dear tomorrow';
const NAV_BUTTON_CLASS =
  'px-4 py-2 rounded-full bg-[#f7c7b6] border border-[#e7b6a4] shadow text-[#4a3c31] hover:bg-[#f4bba8]';

export default function CreateMemoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdMemoryPath, setCreatedMemoryPath] = useState<string | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // If these values change in .env.local, restart `next dev` so Next.js reloads them.
      console.log('Supabase env check:', {
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const memoryId = crypto.randomUUID();

      const selectedFiles = fileInputRef.current?.files
        ? Array.from(fileInputRef.current.files)
        : [];

      const payload = {
        title: title.trim(),
        message: message.trim(),
        unlockDate: unlockDate.trim(),
        password: password.trim(),
        media: selectedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
      };

      if (!payload.title || !payload.message || !payload.unlockDate) {
        throw new Error('Title, message, and unlock date are required');
      }

      const uploadedMedia = await Promise.all(
        selectedFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop() ?? 'file';
          const fileName = `memories/${memoryId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(fileName, file, {
              cacheControl: '3600',
              contentType: file.type,
            });

          if (uploadError) throw new Error(uploadError.message);

          const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .getPublicUrl(uploadData.path);

          if (!publicUrlData.publicUrl) {
            throw new Error('Failed to generate a public URL for the uploaded media');
          }

          return {
            path: uploadData.path,
            publicUrl: publicUrlData.publicUrl,
            name: file.name,
            type: file.type,
          };
        })
      );

      const mediaUrl = uploadedMedia[0]?.publicUrl ?? null;

      const createResponse = await fetch('/api/shared-memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: memoryId,
          title: payload.title,
          message: payload.message,
          unlockDate: payload.unlockDate,
          mediaUrl,
          password: payload.password,
        }),
      });

      const responseText = await createResponse.text();
      let createPayload: {
        error?: string;
        memory?: {
          id?: string;
          created_at?: string;
        } | null;
      } | null = null;

      if (responseText) {
        try {
          createPayload = JSON.parse(responseText) as {
            error?: string;
            memory?: {
              id?: string;
              created_at?: string;
            } | null;
          };
        } catch {
          createPayload = null;
        }
      }

      console.log('Create memory response data:', createPayload);

      if (!createResponse.ok) {
        if (uploadedMedia.length > 0) {
          const uploadedPaths = uploadedMedia.map((item) => item.path);
          await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove(uploadedPaths);
        }
        throw new Error(createPayload?.error ?? 'Failed to create memory');
      }

      const insertedMemory = createPayload?.memory;

      if (!insertedMemory || typeof insertedMemory !== 'object') {
        if (uploadedMedia.length > 0) {
          const uploadedPaths = uploadedMedia.map((item) => item.path);
          await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove(uploadedPaths);
        }
        throw new Error(
          'Memory creation did not return a saved record. Please try again.'
        );
      }

      const existingMemories = window.localStorage.getItem(STORAGE_KEY);
      const parsedMemories = existingMemories ? JSON.parse(existingMemories) : [];
      const createdAt =
        typeof insertedMemory?.created_at === 'string'
          ? insertedMemory.created_at
          : new Date().toISOString();

      const memoryRecord = {
        id: memoryId,
        title: payload.title,
        message: payload.message,
        unlockDate: payload.unlockDate,
        imageName: uploadedMedia[0]?.name ?? null,
        imageDataUrl: uploadedMedia[0]?.type?.startsWith('image/')
          ? mediaUrl
          : null,
        mediaUrl,
        mediaUrls: uploadedMedia.map((item) => item.publicUrl),
        createdAt,
      };

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([memoryRecord, ...parsedMemories])
      );

      setTitle('');
      setMessage('');
      setUnlockDate('');
      setPassword('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFileNames([]);
      setCreatedMemoryPath(buildMemoryPath(memoryId));
      setSubmitted(true);
    } catch (error) {
      console.error('Create memory error:', error);
      const message =
        error instanceof Error ? error.message : 'Error creating memory';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFileNames(files.map((file) => file.name));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-gray-100 rounded-3xl p-10 space-y-6 shadow text-center">
          <span className="text-sm font-semibold text-gray-500">CREATE MEMORY</span>
          <h1 className="text-4xl font-bold leading-tight">Memory Submitted!</h1>
          <p className="text-gray-600">
            Choose where you want to go next.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className={NAV_BUTTON_CLASS}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => router.push('/timeline')}
              className={NAV_BUTTON_CLASS}
            >
              Timeline
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setCreatedMemoryPath(null);
                router.push('/create');
              }}
              className={NAV_BUTTON_CLASS}
            >
              Create Memory
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!createdMemoryPath) {
                  return;
                }

                await navigator.clipboard.writeText(
                  `${window.location.origin}${createdMemoryPath}`
                );
              }}
              className={NAV_BUTTON_CLASS}
            >
              Copy Shareable Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] flex flex-col items-center p-6">
      {/* Top Section */}
      <div className="w-full max-w-4xl flex justify-between items-start mb-8">
        <div className="space-y-2">
          <span className="text-sm font-semibold text-gray-500">CREATE MEMORY</span>
          <h1 className="text-4xl font-bold leading-tight">Start a memory for tomorrow.</h1>
          <p className="text-gray-600 max-w-md">
            Fill in the details below to create a memory that you can revisit later. Add photos, videos, and a message to keep it special.
          </p>
        </div>

        {/* Right-side Pill Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className={NAV_BUTTON_CLASS}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => router.push('/timeline')}
            className={NAV_BUTTON_CLASS}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-3xl bg-gray-100 rounded-3xl p-10 space-y-6 shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TITLE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* MESSAGE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">MESSAGE</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 h-32"
            />
          </div>

          {/* PHOTOS OR VIDEOS */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">PHOTOS OR VIDEOS</label>
            <div
              className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400"
              onClick={handleFileClick}
            >
              <p className="text-gray-500">Upload photos or videos</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {selectedFileNames.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedFileNames.map((fileName) => (
                  <p
                    key={fileName}
                    className="text-sm text-gray-600 break-all"
                  >
                    {fileName}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {/* UNLOCK DATE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">UNLOCK DATE</label>
            <input
              type="date"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700">
              PASSWORD (OPTIONAL)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Protect this shared memory with a password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-base font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Creating...' : 'Create Memory'}
          </button>
        </form>
      </div>
    </div>
  );
}
