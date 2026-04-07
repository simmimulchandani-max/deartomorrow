'use client';

import { useState } from "react";
import MemoryPolaroid from "@/components/MemoryPolaroid";

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
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#f7c7b6] px-5 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8]";

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
        title={memory.title}
        message={memory.message}
        unlockDateLabel={unlockDateLabel}
        createdAtLabel={createdAtLabel}
        mediaUrls={memory.mediaUrls}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-3xl bg-gray-100 p-8 shadow sm:p-10">
      <p className="text-sm font-semibold text-gray-500">PROTECTED MEMORY</p>
      <h1 className="mt-3 font-[family:var(--font-display)] text-4xl leading-tight text-gray-800">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-gray-600">
        This shared memory is password protected. Enter the password to reveal the
        note and media inside the polaroid.
      </p>

      <div className="mt-8 rounded-2xl border border-[#eadfce] bg-white px-5 py-4">
        <p className="text-sm text-gray-600">Unlocks {unlockDateLabel}</p>
        <p className="mt-1 text-sm text-gray-600">Saved {createdAtLabel}</p>
      </div>

      <form onSubmit={handleUnlock} className="mt-8 space-y-4">
        <div>
          <label htmlFor="memory-password" className="block text-sm font-medium text-gray-700">
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

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button type="submit" disabled={loading} className={BUTTON_CLASS}>
          {loading ? "Unlocking..." : "Unlock Memory"}
        </button>
      </form>
    </section>
  );
}
