'use client';

import Link from "next/link";
import { useState } from "react";
import { Caveat } from "next/font/google";
import MemoryPolaroid from "@/components/MemoryPolaroid";
import UnlockWaveBackground from "@/components/UnlockWaveBackground";

const handwritten = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type ProtectedMemoryGateProps = {
  memoryId: string;
  title: string;
  unlockDateLabel: string;
  createdAtLabel: string;
};

type UnlockedMemory = {
  title: string;
  message: string;
  mediaUrls: string[];
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-5 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition hover:bg-[#f4bba8]";

export default function ProtectedMemoryGate({
  memoryId,
  title,
  unlockDateLabel,
  createdAtLabel,
}: ProtectedMemoryGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState<UnlockedMemory | null>(null);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/shared-memories/${memoryId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json()) as {
        error?: string;
        memory?: UnlockedMemory;
      };

      if (!response.ok || !payload.memory) {
        throw new Error(payload.error || "Unable to unlock memory.");
      }

      setMemory(payload.memory);
      setPassword("");
    } catch (unlockError) {
      setError(
        unlockError instanceof Error
          ? unlockError.message
          : "Unable to unlock memory."
      );
    } finally {
      setLoading(false);
    }
  }

  if (memory) {
    return (
      <MemoryPolaroid
        memoryId={memoryId}
        title={memory.title}
        message={memory.message}
        unlockDateLabel={unlockDateLabel}
        createdAtLabel={createdAtLabel}
        mediaUrls={memory.mediaUrls}
      />
    );
  }

  return (
    <>
      <section className="relative isolate min-h-screen overflow-hidden bg-[#4a3c31]">
        <UnlockWaveBackground />

        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center justify-start px-4 pb-28 pt-2 text-center sm:px-6 sm:pb-32 sm:pt-6">
          <div className="absolute left-1/2 top-[3%] h-[28rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#F5F0E6]/76 blur-3xl" />

          <h1
            className={`${handwritten.className} relative z-10 mt-3 text-[2.8rem] leading-none text-[#4a3c31] sm:text-[3.4rem]`}
          >
            {title}
          </h1>
          <p className="relative z-10 mt-2 text-sm font-medium text-white">{unlockDateLabel}</p>

          <div className="relative z-10 mt-5 w-full max-w-[min(600px,88vw)] rotate-[-1.5deg] rounded-[2rem] bg-gray-100 p-4 pb-9 shadow-[0_28px_80px_rgba(74,60,49,0.32)] sm:mt-6 sm:p-5 sm:pb-11 lg:w-[600px] lg:max-w-[600px] lg:max-h-[95vh] lg:pb-12">
            <div className="rounded-[1.5rem] bg-[#f8f1e8] px-6 py-8">
              <p className="text-sm font-semibold tracking-[0.18em] text-gray-500">
                PROTECTED MEMORY
              </p>
              <p className="mt-5 text-base leading-8 text-[#4a3c31]">
                This memory is waiting behind a password. Enter it to reveal the
                note and its keepsakes.
              </p>

              <div className="mt-6 rounded-2xl border border-[#eadfce] bg-gray-100 px-4 py-4 text-left">
                <p className="text-sm text-gray-600">Unlocks {unlockDateLabel}</p>
                <p className="mt-1 text-sm text-gray-600">Saved {createdAtLabel}</p>
              </div>
            </div>

            <form onSubmit={handleUnlock} className="mt-8 space-y-4 px-3 text-left sm:mt-9 sm:px-4">
              <div>
                <label
                  htmlFor="memory-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="memory-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="Enter password"
                />
              </div>

              {error ? <p className="text-sm text-gray-600">{error}</p> : null}

              <button type="submit" disabled={loading} className={BUTTON_CLASS}>
                {loading ? "Unlocking..." : "Unlock Memory"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eadfce] bg-[#F5F0E6]/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-3 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Home
          </Link>
          <Link
            href="/timeline"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-3 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Timeline
          </Link>
          <Link
            href="/create"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-3 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Create Memory
          </Link>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-3 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow transition hover:bg-[#f4bba8]"
          >
            Share
          </button>
        </div>
      </nav>
    </>
  );
}
