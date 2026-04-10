'use client';

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Caveat } from "next/font/google";
import { buildMemoryPath } from "@/lib/memoryPaths";
import UnlockWaveBackground from "@/components/UnlockWaveBackground";

const handwritten = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type MemoryPolaroidProps = {
  memoryId: string;
  title: string;
  message: string;
  unlockDateLabel: string;
  createdAtLabel: string;
  mediaUrls: string[];
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
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] text-[#4a3c31] shadow transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
    >
      {children}
    </a>
  );
}

export default function MemoryPolaroid({
  memoryId,
  title,
  message,
  unlockDateLabel,
  createdAtLabel,
  mediaUrls,
}: MemoryPolaroidProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalItems = mediaUrls.length;
  const hasMedia = totalItems > 0;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return buildMemoryPath(memoryId);
    }

    return `${window.location.origin}${buildMemoryPath(memoryId)}`;
  }, [memoryId]);

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

    if (reducedMotion) {
      return;
    }

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

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
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
    const confirmDelete = window.confirm("Delete memory? This can't be undone.");
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      window.location.href = "/timeline";
    } catch (err) {
      alert("Something went wrong deleting this memory.");
    } finally {
      setIsDeleting(false);
    }
  }

  function goToPrevious() {
    if (totalItems < 2) {
      return;
    }

    setActiveIndex((current) => (current - 1 + totalItems) % totalItems);
  }

  function goToNext() {
    if (totalItems < 2) {
      return;
    }

    setActiveIndex((current) => (current + 1) % totalItems);
  }

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[#4a3c31]">
      <UnlockWaveBackground />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-start px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20">
        <div className="absolute left-1/2 top-[3%] h-[28rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#F5F0E6]/76 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col items-center">
          <h1
            className={`${handwritten.className} mt-3 text-[2.8rem] leading-none text-[#4a3c31] sm:text-[3.4rem]`}
          >
            {title}
          </h1>

          <p className="mt-2 text-sm font-medium text-white">{unlockDateLabel}</p>

          {!hasMedia ? (
            <p className="mt-2 max-w-md text-sm leading-7 text-[#4a3c31] sm:text-base">
              A quiet piece of your story, saved here like something held
              between pages.
            </p>
          ) : null}

          <article className="mt-5 w-full max-w-[min(600px,88vw)] rotate-[-1.5deg] rounded-[2rem] bg-gray-100 p-4 pb-9 shadow-[0_28px_80px_rgba(74,60,49,0.32)] sm:mt-6 sm:p-5 sm:pb-11 lg:w-[600px] lg:max-w-[600px] lg:max-h-[95vh] lg:pb-12">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#f8f1e8] shadow-inner">
              <div className="relative aspect-[4/5] max-h-[72vh] overflow-hidden lg:max-h-[70vh]">
                {hasMedia ? (
                  <div
                    className="flex h-full w-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                  >
                    {mediaUrls.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className="relative h-full w-full shrink-0 bg-[#f8f1e8]"
                      >
                        {isVideo(src) ? (
                          <video
                            src={src}
                            controls
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Image
                            src={src}
                            alt={`${title} media ${index + 1}`}
                            fill
                            unoptimized
                            className="object-contain"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full bg-[#f8f1e8]" />
                )}
              </div>

              {totalItems > 1 ? (
                <div className="flex items-center justify-center gap-3 px-4 py-4">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    aria-label="Previous media"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7c7b6] text-[#4a3c31] transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                  >
                    <span aria-hidden="true">&lt;</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {mediaUrls.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Go to media ${index + 1}`}
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          index === activeIndex ? "bg-[#f7c7b6]" : "bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="Next media"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7c7b6] text-[#4a3c31] transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                  >
                    <span aria-hidden="true">&gt;</span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="px-3 pt-8 sm:px-4 sm:pt-9 lg:pt-10">
              <p className="whitespace-pre-wrap text-center text-sm leading-7 text-[#4a3c31] sm:text-base sm:leading-8 lg:text-lg">
                {message}
              </p>
              <p className="mt-6 text-center text-sm text-gray-500">
                Saved {createdAtLabel}
              </p>
            </div>
          </article>

          <div className="mt-6 flex max-w-[24rem] flex-wrap items-center justify-center gap-3 sm:mt-8 sm:max-w-none">
            <ShareIconButton href={shareLinks.twitter} label="Share on X">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.3L6.6 21H3.5l7.3-8.3L3 3h6.2l4.3 5.8L18.9 3Zm-1.1 16h1.7L8.3 4.9H6.5L17.8 19Z" />
              </svg>
            </ShareIconButton>

            <ShareIconButton href={shareLinks.facebook} label="Share on Facebook">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M13.5 21v-7h2.3l.4-2.8h-2.7V9.4c0-.8.2-1.4 1.4-1.4H16V5.5c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.2v2.6H9v2.8h2.4v7h2.1Z" />
              </svg>
            </ShareIconButton>

            <ShareIconButton href={shareLinks.whatsapp} label="Share on WhatsApp">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12 2a9.8 9.8 0 0 0-8.4 14.8L2 22l5.3-1.5A9.9 9.9 0 1 0 12 2Zm0 17.9c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.1.9.9-3-.2-.3a8 8 0 1 1 6.9 3.8Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.5.7c-.1.2-.3.2-.6.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.3 0-.5.1-.6l.4-.4.3-.5c.1-.1.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 4 3.4 1.5.6 2 .6 2.7.5.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1 0-.3-.1-.5-.2Z" />
              </svg>
            </ShareIconButton>

            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-4 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Share
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-4 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              {copied ? "Link Copied" : "Copy Link"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-300 bg-red-400 px-4 text-sm font-semibold tracking-[0.18em] text-white shadow transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}