'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateId } from '@/lib/generateId';
import { buildMemoryPath } from '@/lib/memoryPaths';
import {
  MAX_MEDIA_FILES,
  MEMORY_MESSAGE_MAX,
  MEMORY_PASSWORD_MAX,
  MEMORY_TITLE_MAX,
  validateMediaFiles,
} from '@/lib/validation';

const STORAGE_KEY = 'dear-tomorrow-memories';
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
  const [submissionWarning, setSubmissionWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { getSupabaseClient } = await import('@/lib/supabaseClient');
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!user || !session) {
        throw new Error('Please log in before creating a memory.');
      }

      const memoryId = generateId();
      const selectedFiles = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : [];
      const payload = {
        title: title.trim(),
        message: message.trim(),
        unlockDate: unlockDate.trim(),
        password: password.trim(),
      };

      if (!payload.title || !payload.message || !payload.unlockDate) {
        throw new Error('Title, message, and unlock date are required');
      }

      if (payload.title.length > MEMORY_TITLE_MAX) {
        throw new Error(`Title must be ${MEMORY_TITLE_MAX} characters or less.`);
      }

      if (payload.message.length > MEMORY_MESSAGE_MAX) {
        throw new Error(`Message must be ${MEMORY_MESSAGE_MAX} characters or less.`);
      }

      if (payload.password.length > MEMORY_PASSWORD_MAX) {
        throw new Error(`Password must be ${MEMORY_PASSWORD_MAX} characters or less.`);
      }

      const mediaValidationError = validateMediaFiles(
        selectedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        }))
      );
      if (mediaValidationError) {
        throw new Error(mediaValidationError);
      }

      let uploadedMediaUrls: string[] = [];
      const failedUploads: string[] = [];

      if (selectedFiles.length > 0) {
        const uploadTargetResponse = await fetch('/api/shared-memories/upload-targets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: memoryId,
            files: selectedFiles.map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
            })),
          }),
        });

        const uploadTargetPayload = (await uploadTargetResponse.json()) as {
          error?: string;
          uploads?: Array<{
            fileName: string;
            contentType: string;
            signedUrl: string;
            path: string;
            token: string;
            publicUrl: string;
          }>;
        };

        if (!uploadTargetResponse.ok) {
          throw new Error(uploadTargetPayload.error ?? 'Failed to prepare uploads');
        }

        const uploadTargets = Array.isArray(uploadTargetPayload.uploads)
          ? uploadTargetPayload.uploads
          : [];

        if (uploadTargets.length !== selectedFiles.length) {
          throw new Error('Could not prepare every attachment for upload.');
        }

        const uploadResults = await Promise.all(
          selectedFiles.map(async (file, index) => {
            const target = uploadTargets[index];
            const uploadResponse = await fetch(target.signedUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
              },
              body: file,
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              return {
                ok: false as const,
                fileName: file.name,
                error: errorText || 'Upload failed',
              };
            }

            return {
              ok: true as const,
              fileName: file.name,
              publicUrl: target.publicUrl,
            };
          })
        );

        uploadedMediaUrls = uploadResults
          .filter((result): result is { ok: true; fileName: string; publicUrl: string } => result.ok)
          .map((result) => result.publicUrl);

        failedUploads.push(
          ...uploadResults
            .filter((result): result is { ok: false; fileName: string; error: string } => !result.ok)
            .map((result) => result.fileName)
        );
      }

      const createResponse = await fetch('/api/shared-memories', {
        method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: memoryId,
            title: payload.title,
            message: payload.message,
            unlockDate: payload.unlockDate,
            password: payload.password,
            mediaUrls: uploadedMediaUrls,
          }),
        });

      const responseText = await createResponse.text();
      let createPayload: {
        error?: string;
        memory?: {
          id?: string;
          created_at?: string;
          media_url?: string | null;
          media_urls?: string[];
        } | null;
      } | null = null;

      if (responseText) {
        try {
          createPayload = JSON.parse(responseText) as {
            error?: string;
            memory?: {
              id?: string;
              created_at?: string;
              media_url?: string | null;
              media_urls?: string[];
            } | null;
          };
        } catch {
          createPayload = null;
        }
      }

      if (!createResponse.ok) {
        throw new Error(createPayload?.error ?? 'Failed to create memory');
      }

      const insertedMemory = createPayload?.memory;

      if (!insertedMemory || typeof insertedMemory !== 'object') {
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
        imageName: selectedFiles[0]?.name ?? null,
        imageDataUrl: selectedFiles[0]?.type?.startsWith('image/')
          ? insertedMemory.media_url ?? null
          : null,
        mediaUrl: insertedMemory.media_url ?? null,
        mediaUrls: Array.isArray(insertedMemory.media_urls) ? insertedMemory.media_urls : [],
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
      setSubmissionWarning(
        failedUploads.length > 0
          ? `Created the memory, but ${failedUploads.length} attachment${failedUploads.length === 1 ? '' : 's'} could not be uploaded.`
          : null
      );
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
          {submissionWarning ? (
            <p className="rounded-2xl bg-[#fff4dc] px-4 py-3 text-sm text-[#6c5630]">
              {submissionWarning}
            </p>
          ) : null}
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
                router.push('/create/memory');
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
  <div className="min-h-screen bg-[#F5F0E6] flex flex-col items-center px-6 pt-16 pb-10">
    
    {/* Header */}
    <div className="w-full max-w-2xl text-center space-y-4 mb-10">
      <span className="text-sm font-semibold text-gray-500 tracking-[0.16em]">
        CREATE MEMORY
      </span>

      <h1 className="text-4xl font-bold leading-tight text-[#4a3c31]">
        Start a memory for tomorrow.
      </h1>

      <p className="text-gray-600">
        Fill in the details below to create a memory you can revisit later.
        Add photos, videos, and a message to keep it special.
      </p>
    </div>

    {/* Form Card */}
    <div className="w-full max-w-2xl bg-gray-100 rounded-3xl p-8 sm:p-10 space-y-6 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* TITLE */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">TITLE</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MEMORY_TITLE_MAX}
            className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {/* MESSAGE */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">MESSAGE</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MEMORY_MESSAGE_MAX}
            className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 h-32"
          />
        </div>

        {/* MEDIA */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">
            PHOTOS OR VIDEOS
          </label>

          <button
            type="button"
            className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={handleFileClick}
          >
            <p className="text-gray-500">Upload photos or videos</p>
          </button>

          <input
            type="file"
            multiple
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFileNames.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedFileNames.map((fileName) => (
                <p key={fileName} className="text-sm text-gray-600 break-all">
                  {fileName}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* UNLOCK DATE */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <label htmlFor="unlock-date" className="font-medium text-gray-700">
              UNLOCK DATE
            </label>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="Unlock date help"
                aria-describedby="unlock-date-help"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#fffaf2] text-xs font-bold text-[#4a3c31] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d79a87] focus:ring-offset-2"
              >
                i
              </button>
              <span
                id="unlock-date-help"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-8 z-10 w-64 -translate-x-1/2 rounded-2xl border border-[#eadfce] bg-[#fffaf2] px-4 py-3 text-sm font-normal leading-6 text-[#5f5147] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 sm:left-0 sm:translate-x-0"
              >
                Choose the future date when this memory becomes available to open.
              </span>
            </span>
          </div>
          <input
            id="unlock-date"
            type="date"
            value={unlockDate}
            onChange={(e) => setUnlockDate(e.target.value)}
            className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block mb-2 font-medium text-gray-700">
            PASSWORD (OPTIONAL)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={MEMORY_PASSWORD_MAX}
            className="w-full p-4 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Protect this shared memory with a password"
          />
          <p className="mt-2 text-xs text-gray-500">
            Up to {MAX_MEDIA_FILES} files, 25MB each.
          </p>
        </div>

        {/* SUBMIT */}
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
