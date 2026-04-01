"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type CapsuleResponse = {
  capsule?: {
    id?: string;
  };
  error?: string;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [minDate, setMinDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    setMinDate(local.toISOString().slice(0, 10));
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMediaFiles(Array.from(event.target.files ?? []));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("message", message);
      formData.append("unlockDate", unlockDate);

      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await fetch("/api/capsules", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        let errorMessage = "Unable to create capsule.";

        if (contentType.includes("application/json")) {
          const errorPayload = (await response.json()) as CapsuleResponse;
          errorMessage = errorPayload.error ?? errorMessage;
        }

        throw new Error(errorMessage);
      }

      const payload = contentType.includes("application/json")
        ? ((await response.json()) as CapsuleResponse)
        : null;

      if (payload?.capsule?.id) {
        router.push(`/capsule/${payload.capsule.id}`);
        return;
      }

      router.push("/timeline");
    } catch (caughtError) {
      setError(formatError(caughtError));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2e9] px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[2rem] bg-[#efe6d8] p-6 shadow-[0_24px_80px_rgba(74,60,49,0.08)] sm:p-8 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4a3c31]">
              CREATE CAPSULE
            </p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-4xl leading-tight text-[#4a3c31] sm:text-5xl">
              Start a capsule for tomorrow.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#6e6257]">
              Write a note, add your favorite photos or videos, and choose the
              date you want this memory to open again.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-full bg-[#f7f2e9] p-1.5">
            <Link
              href="/"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-[#4a3c31] transition hover:bg-white/70"
            >
              Home
            </Link>
            <Link
              href="/timeline"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-[#4a3c31] transition hover:bg-white/70"
            >
              Timeline
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.75rem] bg-[#f7f2e9] p-5 sm:p-7 md:p-8"
        >
          <div className="space-y-5">
            <div className="space-y-2.5">
              <label
                htmlFor="title"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4a3c31]"
              >
                TITLE
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Name your capsule"
                className="w-full rounded-[1.5rem] border border-white/70 bg-white/90 px-5 py-4 text-base text-[#4a3c31] outline-none transition focus:border-[#f7d2c1]"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="message"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4a3c31]"
              >
                MESSAGE
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message"
                className="w-full resize-none rounded-[1.5rem] border border-white/70 bg-white/90 px-5 py-4 text-base text-[#4a3c31] outline-none transition focus:border-[#f7d2c1]"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="media"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4a3c31]"
              >
                PHOTOS OR VIDEOS
              </label>
              <label
                htmlFor="media"
                className="flex min-h-16 cursor-pointer items-center justify-between rounded-[1.5rem] border border-white/70 bg-white/90 px-5 py-4 text-base text-[#6e6257] transition hover:border-[#f7d2c1]"
              >
                <span>
                  {mediaFiles.length > 0
                    ? `${mediaFiles.length} file${mediaFiles.length === 1 ? "" : "s"} selected`
                    : "Upload photos or videos"}
                </span>
              </label>
              <input
                id="media"
                name="media"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="unlockDate"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4a3c31]"
              >
                UNLOCK DATE
              </label>
              <input
                id="unlockDate"
                name="unlockDate"
                type="date"
                required
                min={minDate || undefined}
                value={unlockDate}
                onChange={(event) => setUnlockDate(event.target.value)}
                className="w-full rounded-[1.5rem] border border-white/70 bg-white/90 px-5 py-4 text-base text-[#4a3c31] outline-none transition focus:border-[#f7d2c1]"
              />
            </div>

            {error ? (
              <p className="rounded-[1.25rem] bg-white/80 px-4 py-3 text-sm text-[#a15846]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-base font-semibold text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating..." : "Create Capsule"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
