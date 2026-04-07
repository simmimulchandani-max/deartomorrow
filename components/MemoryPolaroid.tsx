'use client';

import Image from "next/image";
import { useState } from "react";

type MemoryPolaroidProps = {
  title: string;
  message: string;
  unlockDateLabel: string;
  createdAtLabel: string;
  mediaUrls: string[];
};

function isVideo(src: string) {
  return src.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)$/i.test(src);
}

export default function MemoryPolaroid({
  title,
  message,
  unlockDateLabel,
  createdAtLabel,
  mediaUrls,
}: MemoryPolaroidProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const totalItems = mediaUrls.length;
  const hasMedia = totalItems > 0;

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + totalItems) % totalItems);
  }

  function goToNext() {
    setActiveIndex((current) => (current + 1) % totalItems);
  }

  return (
    <article className="mx-auto w-full max-w-4xl rounded-[2.5rem] bg-[#fffdf9] p-4 shadow-[0_30px_90px_rgba(74,60,49,0.16)] ring-1 ring-[#eadfce] sm:p-6 lg:p-8">
      <div className="rounded-[1.9rem] bg-[#0e0e10] p-3 sm:p-4">
        <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-black">
          {hasMedia ? (
            <>
              <div
                className="flex h-full w-full transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {mediaUrls.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative h-full w-full shrink-0 bg-black"
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

              {totalItems > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPrevious}
                    aria-label="Previous media"
                    className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#f7c7b6] text-[#4a3c31] shadow transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b79f]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      {"<"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="Next media"
                    className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#f7c7b6] text-[#4a3c31] shadow transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b79f]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      {">"}
                    </span>
                  </button>

                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                    {mediaUrls.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Go to media ${index + 1}`}
                        onClick={() => setActiveIndex(index)}
                        className={`h-2.5 rounded-full transition ${
                          index === activeIndex
                            ? "w-8 bg-[#f7c7b6]"
                            : "w-2.5 bg-white/45 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-end bg-[radial-gradient(circle_at_top,_rgba(247,199,182,0.16)_0%,_rgba(14,14,16,1)_62%)] p-6 sm:p-8">
              <p className="max-w-xs text-sm leading-7 text-white/75 sm:text-base">
                A quiet piece of your story, held here like a keepsake.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 pb-2 pt-6 sm:px-5 sm:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
              Unlocked Memory
            </p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-3xl leading-tight text-[#33261f] sm:text-4xl">
              {title}
            </h1>
          </div>

          <div className="rounded-2xl bg-[#f8f1e8] px-4 py-3 text-sm text-gray-600 ring-1 ring-[#eadfce]">
            <p>Unlocks {unlockDateLabel}</p>
            <p className="mt-1">Saved {createdAtLabel}</p>
          </div>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-gray-700 sm:text-lg">
          {message}
        </p>
      </div>
    </article>
  );
}
