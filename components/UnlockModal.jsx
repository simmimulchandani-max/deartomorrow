"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Particles from "@tsparticles/react";
import { loadFull } from "tsparticles";
import { Dancing_Script } from "next/font/google";

const handwritten = Dancing_Script({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const MOTIVATIONAL_LINE = "Your past self left you this...";

function playSoftChime() {
  const AudioContextClass =
    window.AudioContext ||
    (window).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;
  const masterGain = audioContext.createGain();

  masterGain.connect(audioContext.destination);
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.035, now + 0.04);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);

  const makeTone = (type, start, frequency, endFrequency, duration, volume) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + duration
    );

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration);
  };

  makeTone("sine", now, 783.99, 1046.5, 1.15, 0.7);
  makeTone("triangle", now + 0.15, 1174.66, 1567.98, 1.1, 0.35);
  makeTone("sine", now + 0.32, 1567.98, 1396.91, 0.9, 0.18);

  window.setTimeout(() => {
    void audioContext.close();
  }, 1900);
}

function createConfettiPieces() {
  return Array.from({ length: 28 }, (_, index) => ({
    id: index,
    left: 4 + index * 3.35,
    delay: (index % 7) * 0.05,
    duration: 2.6 + (index % 5) * 0.18,
    rotation: -24 + (index % 8) * 8,
    color: [
      "#f6dfb9",
      "#f9efe0",
      "#b9dceb",
      "#8fc4dc",
      "#f7c7b6",
      "#fff7ee",
    ][index % 6],
  }));
}

function getMemoryMedia(memory) {
  const sources = [
    ...(Array.isArray(memory?.mediaUrls) ? memory.mediaUrls : []),
    memory?.imageDataUrl,
    memory?.image,
    memory?.imageUrl,
    memory?.media,
    memory?.mediaUrl,
    memory?.video,
    memory?.videoUrl,
  ].filter(Boolean);

  return sources
    .filter((src, index) => sources.indexOf(src) === index)
    .map((src, index) => ({
      src,
      rotation: [-3, 2, -2, 4, -1, 3][index % 6],
      isVideo:
        src.startsWith("data:video/") ||
        /\.(mp4|webm|ogg|mov)$/i.test(src),
    }));
}

function IconButton({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-elevated inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/70 px-3 text-sm font-semibold transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
    >
      {children}
    </a>
  );
}

export default function UnlockModal({
  memory,
  onClose,
  onDelete,
  shareUrl,
  shareLinks,
  metaText,
}) {
  const [typedText, setTypedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mediaItems = getMemoryMedia(memory);
  const confettiPieces = createConfettiPieces();

  function handleClose() {
    setIsVisible(false);
    window.setTimeout(() => {
      onClose?.();
    }, 320);
  }

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete this memory?")) {
      onDelete?.(memory.id);
    }
  }

  useEffect(() => {
    if (!memory) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
      if (!reducedMotion) {
        setShowConfetti(true);
      }
    });

    if (!reducedMotion) {
      playSoftChime();
    }

    if (reducedMotion) {
      const revealTimer = window.setTimeout(() => {
        setTypedText(MOTIVATIONAL_LINE);
      }, 0);

      return () => {
        document.body.style.overflow = "";
        window.cancelAnimationFrame(frame);
        window.clearTimeout(revealTimer);
      };
    } else {
      let index = 0;
      const typingTimer = window.setInterval(() => {
        index += 1;
        setTypedText(MOTIVATIONAL_LINE.slice(0, index));

        if (index >= MOTIVATIONAL_LINE.length) {
          window.clearInterval(typingTimer);
        }
      }, 48);

      const confettiTimer = window.setTimeout(() => {
        setShowConfetti(false);
      }, 2600);

      return () => {
        document.body.style.overflow = "";
        window.cancelAnimationFrame(frame);
        window.clearInterval(typingTimer);
        window.clearTimeout(confettiTimer);
      };
    }
  }, [memory]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  });

  async function particlesInit(engine) {
    await loadFull(engine);
  }

  async function handleWebShare() {
    if (!navigator.share) {
      return;
    }

    try {
      await navigator.share({
        title: memory?.title || "Dear Tomorrow",
        text: memory?.message || "",
        url: shareUrl || window.location.href,
      });
    } catch {}
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  if (!memory) {
    return null;
  }

  const canNativeShare =
    typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto transition duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-modal="true"
      role="dialog"
      aria-labelledby="unlock-memory-title"
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close unlock modal"
        className="absolute inset-0 h-full w-full bg-[linear-gradient(180deg,_#faf1df_0%,_#f1e3c6_42%,_#d6ebf5_100%)]"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,248,229,0.72)_0%,_rgba(255,248,229,0.18)_28%,_rgba(255,248,229,0)_58%)]" />
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#fff6dc]/65 blur-3xl" />
        <div className="absolute left-[-8%] top-[16%] h-64 w-64 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute right-[-10%] top-[22%] h-80 w-80 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute bottom-[-18%] left-1/2 h-[28rem] w-[150%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(241,223,186,0.96)_0%,_rgba(232,214,182,0.88)_42%,_rgba(232,214,182,0)_74%)]" />

        <Particles
          id="unlock-sand-particles"
          init={particlesInit}
          className="absolute inset-0"
          options={{
            fullScreen: { enable: false },
            detectRetina: true,
            fpsLimit: 60,
            particles: {
              number: { value: 54, density: { enable: true, area: 1200 } },
              color: { value: ["#f7ecd7", "#f3dcc0", "#ffffff", "#d9edf7"] },
              opacity: {
                value: { min: 0.08, max: 0.28 },
                animation: { enable: true, speed: 0.25, sync: false },
              },
              size: { value: { min: 1, max: 3.5 } },
              shape: { type: "circle" },
              move: {
                enable: true,
                speed: 0.55,
                direction: "bottom",
                drift: 0.6,
                outModes: { default: "out" },
              },
            },
            interactivity: {
              events: {
                onHover: { enable: false },
                onClick: { enable: false },
                resize: { enable: true },
              },
            },
          }}
        />

        {showConfetti ? (
          <div className="pointer-events-none absolute inset-0 z-20">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="absolute top-[-10%] h-3 w-2 rounded-full opacity-0"
                style={{
                  left: `${piece.left}%`,
                  backgroundColor: piece.color,
                  animation: `confetti-fall ${piece.duration}s cubic-bezier(0.2,0.72,0.25,1) ${piece.delay}s forwards`,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative flex min-h-screen items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div
          className={`relative w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/65 bg-white/60 shadow-[0_30px_120px_rgba(68,92,108,0.18)] backdrop-blur-xl transition duration-700 ease-out ${
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-8 scale-[0.985] opacity-0"
          }`}
        >
          <div className="flex min-h-[calc(100vh-3rem)] flex-col">
            <div className="px-6 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              <div
                className={`transition duration-700 delay-100 ease-out ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                }`}
              >
                <p
                  className={`${handwritten.className} text-elevated min-h-[3rem] text-[1.75rem] leading-tight sm:min-h-[3.5rem] sm:text-[2.15rem]`}
                >
                  {typedText}
                  <span className="ml-1 inline-block h-[1em] w-[1px] animate-pulse bg-slate-500/70 align-[-0.1em]" />
                </p>

                <h2
                  id="unlock-memory-title"
                  className="text-elevated mt-6 font-[family:var(--font-display)] text-4xl leading-tight sm:text-5xl lg:text-6xl"
                >
                  {memory.title}
                </h2>

                <p className="text-elevated mt-4 text-sm leading-7">
                  {metaText}
                </p>

                <div className="mt-8 rounded-[2rem] border border-white/55 bg-white/38 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.36)] sm:px-7 sm:py-8">
                  <p className="text-elevated whitespace-pre-wrap text-base leading-8 sm:text-lg">
                    {memory.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[18rem] flex-1 overflow-hidden border-t border-white/40">
              {mediaItems.length > 0 ? (
                <div
                  className={`h-full min-h-[28rem] w-full overflow-y-auto bg-[linear-gradient(180deg,_rgba(252,248,239,0.7)_0%,_rgba(239,229,207,0.7)_46%,_rgba(211,232,244,0.82)_100%)] px-4 py-5 sm:px-6 sm:py-6 transition duration-[1400ms] ease-out ${
                    isVisible ? "scale-100 opacity-100" : "scale-105 opacity-0"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-6 pb-2 sm:gap-x-6 sm:gap-y-8">
                    {mediaItems.map((item, index) => (
                      <figure
                        key={`${item.src}-${index}`}
                        className="relative w-[14rem] shrink-0 rounded-sm bg-[#fffdf8] p-3 pb-4 shadow-[0_20px_45px_rgba(74,60,49,0.18)] ring-1 ring-[#eadfce] sm:w-[16rem]"
                        style={{
                          transform: `rotate(${item.rotation}deg)`,
                          marginTop: index % 3 === 0 ? "0.75rem" : "0",
                          marginLeft: index % 4 === 0 ? "-0.35rem" : "0",
                          marginRight: index % 5 === 0 ? "-0.35rem" : "0",
                          zIndex: mediaItems.length - index,
                        }}
                      >
                        <div className="overflow-hidden bg-[#f3ecdf]">
                          {item.isVideo ? (
                            <video
                              src={item.src}
                              controls
                              className="h-auto max-h-[18rem] w-full object-contain bg-[#f3ecdf]"
                            />
                          ) : (
                            <Image
                              src={item.src}
                              alt={`${memory.title} media ${index + 1}`}
                              width={1400}
                              height={1400}
                              unoptimized
                              className="h-auto max-h-[18rem] w-full object-contain bg-[#f3ecdf]"
                            />
                          )}
                        </div>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className={`flex h-full min-h-[18rem] w-full items-end bg-[linear-gradient(180deg,_rgba(252,248,239,0.88)_0%,_rgba(239,229,207,0.88)_46%,_rgba(211,232,244,0.92)_100%)] p-8 transition duration-[1400ms] ease-out sm:p-10 ${
                    isVisible ? "scale-100 opacity-100" : "scale-105 opacity-0"
                  }`}
                >
                  <p className="text-elevated max-w-sm text-sm leading-7 sm:text-base">
                    A quiet piece of your story, carried forward by light, tide,
                    and time.
                  </p>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_rgba(28,43,56,0.16)_100%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,246,219,0.22)_0%,_rgba(255,246,219,0.08)_32%,_rgba(255,246,219,0)_56%)]" />
            </div>

            <div className="border-t border-white/40 px-6 py-6 sm:px-10 lg:px-12">
              <div className="flex flex-wrap gap-3">
                {shareLinks?.facebook ? (
                  <IconButton href={shareLinks.facebook} label="Share on Facebook">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-current"
                    >
                      <path d="M13.5 21v-7h2.3l.4-2.8h-2.7V9.4c0-.8.2-1.4 1.4-1.4H16V5.5c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.2v2.6H9v2.8h2.4v7h2.1Z" />
                    </svg>
                  </IconButton>
                ) : null}

                {shareLinks?.twitter ? (
                  <IconButton href={shareLinks.twitter} label="Share on Twitter">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-current"
                    >
                      <path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.3L6.6 21H3.5l7.3-8.3L3 3h6.2l4.3 5.8L18.9 3Zm-1.1 16h1.7L8.3 4.9H6.5L17.8 19Z" />
                    </svg>
                  </IconButton>
                ) : null}

                {shareLinks?.whatsapp ? (
                  <IconButton href={shareLinks.whatsapp} label="Share on WhatsApp">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-current"
                    >
                      <path d="M12 2a9.8 9.8 0 0 0-8.4 14.8L2 22l5.3-1.5A9.9 9.9 0 1 0 12 2Zm0 17.9c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.1.9.9-3-.2-.3a8 8 0 1 1 6.9 3.8Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.5.7c-.1.2-.3.2-.6.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.3 0-.5.1-.6l.4-.4.3-.5c.1-.1.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 4 3.4 1.5.6 2 .6 2.7.5.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1 0-.3-.1-.5-.2Z" />
                    </svg>
                  </IconButton>
                ) : null}

                {canNativeShare ? (
                  <button
                    type="button"
                    onClick={handleWebShare}
                    className="text-elevated inline-flex min-h-11 items-center justify-center rounded-full bg-white/70 px-4 text-sm font-semibold transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
                  >
                    Share
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-elevated inline-flex min-h-11 items-center justify-center rounded-full bg-white/70 px-4 text-sm font-semibold transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
                >
                  {copied ? "Link Copied" : "Copy Link"}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-100 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
                >
                  Delete Memory
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="text-elevated inline-flex min-h-11 items-center justify-center rounded-full border border-white/65 bg-white/55 px-7 text-sm font-semibold tracking-[0.18em] transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
                >
                  Return to Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -10vh, 0) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 110vh, 0) rotate(540deg);
          }
        }
      `}</style>
    </div>
  );
}
