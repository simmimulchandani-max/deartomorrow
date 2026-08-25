'use client';

import { useEffect, useRef, useState } from 'react';
import { generateId } from '@/lib/generateId';
import { trackEvent } from '@/lib/analytics';
import {
  CONTRIBUTOR_NAME_MAX,
  MEMORY_MESSAGE_MAX,
  MEMORY_TITLE_MAX,
  validateMediaFiles,
} from '@/lib/validation';

type PublicCapsule = {
  shareSlug: string;
  title: string;
  description: string | null;
  submissionDeadline: string;
  unlockDate: string;
  submissionsOpen: boolean;
};

type CapsulePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function CapsuleContributionPage({ params }: CapsulePageProps) {
  const [shareSlug, setShareSlug] = useState('');
  const [capsule, setCapsule] = useState<PublicCapsule | null>(null);
  const [contributorName, setContributorName] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCapsule() {
      const resolved = await params;
      setShareSlug(resolved.id);

      try {
        const response = await fetch(`/api/capsules/${resolved.id}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Capsule not found.');
        }

        if (isActive) {
          setCapsule(payload.capsule);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load capsule.'
          );
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
  }, [params]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!capsule || !capsule.submissionsOpen) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let memoryId = generateId();

      const selectedFiles = fileInputRef.current?.files
        ? Array.from(fileInputRef.current.files)
        : [];

      let uploadedMediaUrls: string[] = [];

      if (selectedFiles.length > 0) {
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

        const uploadTargetResponse = await fetch(
          `/api/capsules/${shareSlug}/upload-targets`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              memoryId,
              files: selectedFiles.map((file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
              })),
            }),
          }
        );

        const uploadTargetPayload = await uploadTargetResponse.json().catch(() => null);

        if (!uploadTargetResponse.ok) {
          console.error('Capsule upload target error:', uploadTargetPayload);
          throw new Error(uploadTargetPayload?.error || 'Failed to prepare uploads.');
        }

        if (typeof uploadTargetPayload?.memoryId === 'string') {
          memoryId = uploadTargetPayload.memoryId;
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
                'Content-Type':
                  typeof target.contentType === 'string' && target.contentType
                    ? target.contentType
                    : file.type || 'application/octet-stream',
              },
              body: file,
            });

            if (!uploadResponse.ok) {
              const uploadErrorText = await uploadResponse.text().catch(() => '');
              console.error('Capsule media upload error:', {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                fileName: file.name,
                targetPath: target.path,
                response: uploadErrorText,
              });
              throw new Error(
                `Could not upload ${file.name}. Please try again or choose a smaller file.`
              );
            }

            return target.path as string;
          })
        );

        uploadedMediaUrls = uploadResults;
      }

      const response = await fetch(
        `/api/capsules/${shareSlug}/memories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memoryId,
            capsuleId: shareSlug, // ✅ FIXED (this is what was missing logically)
            contributorName,
            title,
            message,
            mediaUrls: uploadedMediaUrls,
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('Capsule memory submission error:', payload);
        throw new Error(payload?.error || 'Failed to submit memory.');
      }

      setContributorName('');
      setTitle('');
      setMessage('');
      setSelectedFileNames([]);

      if (fileInputRef.current) fileInputRef.current.value = '';

      trackEvent('capsule_contribution_submitted', {
        creation_type: 'capsule',
        has_media: selectedFiles.length > 0,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Capsule contribution submit error:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to submit memory.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setSelectedFileNames(files.map((file) => file.name));
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-[1.75rem] bg-gray-100 p-8 text-center shadow-sm">
          <p className="text-gray-600">Opening capsule...</p>
        </div>
      </main>
    );
  }

  if (!capsule) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-[1.75rem] bg-gray-100 p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-[#4a3c31]">
            Capsule unavailable
          </h1>
          <p className="mt-3 text-gray-600">
            {errorMessage || 'This capsule could not be found.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-6 py-16">
      <section className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
            SHARED CAPSULE
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[#4a3c31]">
            {capsule.title}
          </h1>

          {capsule.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-600">
              {capsule.description}
            </p>
          ) : null}

          <p className="mt-4 text-sm text-gray-500">
            Submissions close {capsule.submissionDeadline}. Unlocks{' '}
            {capsule.unlockDate}.
          </p>
        </div>

        {!capsule.submissionsOpen ? (
          <div className="mt-10 rounded-[1.75rem] bg-gray-100 p-8 text-center">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">
              This capsule is closed for submissions.
            </h2>
          </div>
        ) : submitted ? (
          <div className="mt-10 rounded-[1.75rem] bg-gray-100 p-8 text-center">
            <h2 className="text-2xl font-semibold text-[#4a3c31]">
              Your memory is tucked inside.
            </h2>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#f7c7b6] px-6 text-sm font-semibold text-[#4a3c31]"
            >
              Add Another Memory
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[1.75rem] bg-gray-100 p-8"
          >
            <div className="space-y-6">
              <input
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="Your Name"
                maxLength={CONTRIBUTOR_NAME_MAX}
                className="w-full rounded-2xl border p-4"
                required
              />

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Memory Title"
                maxLength={MEMORY_TITLE_MAX}
                className="w-full rounded-2xl border p-4"
                required
              />

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message"
                maxLength={MEMORY_MESSAGE_MAX}
                className="h-32 w-full rounded-2xl border p-4"
                required
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border border-dashed p-6"
              >
                Upload Photos/Videos
              </button>

              <input
                type="file"
                multiple
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFileNames.length > 0 ? (
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600">
                  <p className="font-semibold text-[#4a3c31]">Selected files</p>
                  <ul className="mt-2 space-y-1">
                    {selectedFileNames.map((fileName) => (
                      <li key={fileName} className="truncate">
                        {fileName}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {errorMessage ? (
                <p className="rounded-2xl border border-[#e7b6a4] bg-white px-4 py-3 text-sm text-[#9b4d3a]">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#f7c7b6] p-4 font-semibold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Memory'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
