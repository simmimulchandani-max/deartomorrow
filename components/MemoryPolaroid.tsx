'use client';

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Caveat } from "next/font/google";
import { buildMemoryPath } from "@/lib/memoryPaths";
import UnlockWaveBackground from "@/components/UnlockWaveBackground";
import { getSupabaseClient } from "@/lib/supabaseClient";

const handwritten = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type MemoryPolaroidProps = {
  memoryId: string;
  ownerUserId?: string | null;
  title: string;
  message: string;
  unlockDateLabel: string;
  createdAtLabel: string;
  mediaUrls: string[];
  sharePath?: string;
  showDeleteButton?: boolean;
  onDelete?: () => void | Promise<void>;
};

function isVideo(src: string) {
  return src.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(src);
}

function ShareIconButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
    >
      {children}
    </a>
  );
}

export default function MemoryPolaroid({
  memoryId,
  ownerUserId = null,
  title,
  message,
  unlockDateLabel,
  createdAtLabel,
  mediaUrls,
  sharePath,
  showDeleteButton = true,
  onDelete,
}: MemoryPolaroidProps){
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [canDelete, setCanDelete] = useState(false);

  const totalItems = mediaUrls.length;
  const hasMedia = totalItems > 0;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return sharePath ?? buildMemoryPath(memoryId);
    }

    return `${window.location.origin}${sharePath ?? buildMemoryPath(memoryId)}`;
  }, [memoryId, sharePath]);

  const shareLinks = useMemo(() => {
    const shareText = `${title} - ${message}`;

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        shareUrl
      )}&text=${encodeURIComponent(shareText)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    };
  }, [message, shareUrl, title]);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    void confetti({
      particleCount: 36,
      spread: 52,
      startVelocity: 18,
      scalar: 0.85,
      ticks: 180,
      origin: { x: 0.5, y: 0.32 },
      colors: ["#f7c7b6", "#f4bba8", "#F5F0E6", "#f8f1e8", "#4a3c31"],
      disableForReducedMotion: true,
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function checkDeletePermission() {
      if (onDelete && showDeleteButton) {
        setCanDelete(true);
        return;
      }

      if (!ownerUserId) {
        setCanDelete(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (active) {
          setCanDelete(session?.user.id === ownerUserId);
        }
      } catch {
        if (active) setCanDelete(false);
      }
    }

    void checkDeletePermission();

    return () => {
      active = false;
    };
  }, [onDelete, ownerUserId, showDeleteButton]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    await handleCopyLink();
  }

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setDeleteError("");

      if (onDelete) {
        await onDelete();
        setShowDeleteModal(false);
        return;
      }

      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please log in before deleting this memory.");
      }

      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete memory.");
      }

      setShowDeleteModal(false);
      window.location.href = "/timeline";
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong deleting this memory."
      );
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  }

  function goToPrevious() {
    if (totalItems < 2) return;
    setActiveIndex((c) => (c - 1 + totalItems) % totalItems);
  }

  function goToNext() {
    if (totalItems < 2) return;
    setActiveIndex((c) => (c + 1) % totalItems);
  }

  return (
    <section className="relative isolate min-h-screen overflow-x-hidden bg-[#4a3c31]">
      <UnlockWaveBackground />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-start px-4 pt-16 text-center">

        <h1 className={`${handwritten.className} mt-3 text-[2.8rem] text-[#4a3c31]`}>
          {title}
        </h1>

        <p className="mt-2 text-sm text-white">{unlockDateLabel}</p>

        <article className="mt-6 w-full max-w-[600px] rounded-[2rem] bg-gray-100 p-5 shadow">
          <div className="overflow-hidden rounded-[1.5rem] bg-[#f8f1e8]">
            <div className="relative aspect-[4/5]">
              {hasMedia ? (
                <div
                  className="flex h-full w-full transition-transform duration-500"
                  style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                >
                  {mediaUrls.map((src, i) => (
                    <div key={i} className="relative h-full w-full shrink-0">
                      {isVideo(src) ? (
                        <video src={src} controls className="h-full w-full object-contain" />
                      ) : (
                        <Image src={src} alt="" fill unoptimized className="object-contain" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full" />
              )}
            </div>
          </div>

          <p className="mt-6 whitespace-pre-wrap break-words text-center leading-8 text-[#4a3c31]">
            {message}
          </p>

          <p className="mt-4 text-sm text-gray-500">Saved {createdAtLabel}</p>
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 pb-10">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            {copied ? "Copied" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Share
          </button>

          {showDeleteButton && canDelete && (
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setShowDeleteModal(true);
              }}
              className="rounded-full bg-red-500 px-4 py-2 text-white"
            >
              Delete
            </button>
          )}
        </div>

        {deleteError ? (
          <p className="mt-4 text-red-300">{deleteError}</p>
        ) : null}
      </div>

      {showDeleteModal ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white p-6 text-center">
            <h2 className="text-xl font-semibold">Delete Memory?</h2>

            <p className="mt-2 text-sm text-gray-600">
              This cannot be undone.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-full bg-gray-200 px-4 py-2 text-[#4a3c31]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full bg-red-500 px-4 py-2 text-white disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
