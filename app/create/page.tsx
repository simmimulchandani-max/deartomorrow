'use client';

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

const STORAGE_KEY = "dear-tomorrow-memories";

type MemoryRecord = {
  id: string;
  title: string;
  message: string;
  unlockDate: string;
  imageName: string | null;
  imageDataUrl: string | null;
  mediaItems?: Array<{
    name: string;
    dataUrl: string;
    type: string;
  }>;
  createdAt: string;
};

type FormState = {
  title: string;
  message: string;
  unlockDate: string;
  imageName: string | null;
  imageDataUrl: string | null;
  mediaItems: Array<{
    name: string;
    dataUrl: string;
    type: string;
  }>;
};

const initialFormState: FormState = {
  title: "",
  message: "",
  unlockDate: "",
  imageName: null,
  imageDataUrl: null,
  mediaItems: [],
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file."));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

export default function CreatePage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
  }, []);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      setForm((current) => ({
        ...current,
        imageDataUrl: null,
        imageName: null,
        mediaItems: [],
      }));
      return;
    }

    try {
      const mediaItems = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
          type: file.type,
        }))
      );

      setForm((current) => ({
        ...current,
        imageDataUrl: mediaItems[0]?.dataUrl ?? null,
        imageName:
          mediaItems.length > 1
            ? `${mediaItems.length} files selected`
            : (mediaItems[0]?.name ?? null),
        mediaItems,
      }));
      setErrorMessage(null);
    } catch {
      setErrorMessage("We couldn't read those files. Please try again.");
    }
  }

  function clearImage() {
    setForm((current) => ({
      ...current,
      imageDataUrl: null,
      imageName: null,
      mediaItems: [],
    }));
  }

  function handleChange(
    field: keyof Pick<FormState, "title" | "message" | "unlockDate">,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildMemoryRecord(): MemoryRecord {
    return {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      message: form.message.trim(),
      unlockDate: form.unlockDate,
      imageName: form.imageName,
      imageDataUrl: form.imageDataUrl,
      mediaItems: form.mediaItems,
      createdAt: new Date().toISOString(),
    };
  }

  function saveMemory(memory: MemoryRecord) {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    const parsed: MemoryRecord[] = existing ? JSON.parse(existing) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([memory, ...parsed]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const memory = buildMemoryRecord();
      saveMemory(memory);
      setForm(initialFormState);
      setFileInputKey((current) => current + 1);
      setSaveMessage("Your memory has been tucked away for the future.");
    } catch {
      setErrorMessage("Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_46%,_#d6ebf5_100%)] px-4 py-8 sm:px-6 sm:py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-2%] h-72 w-72 rounded-full bg-white/45 blur-3xl" />
        <div className="absolute right-[-12%] top-[18%] h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute left-[10%] top-[24%] h-40 w-40 rounded-full bg-[#f7dccc]/40 blur-2xl" />
        <div className="absolute bottom-[-18%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(236,221,194,0.86)_42%,_rgba(233,216,188,0)_75%)]" />
      </div>

      <section className="relative w-full max-w-4xl rounded-[1.75rem] border border-white/60 bg-white/55 shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:rounded-[2.25rem]">
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[1.5rem] px-1 py-2 sm:space-y-6 sm:px-2 sm:py-4"
          >
            <div className="rounded-[1.5rem] border border-white/55 bg-white/42 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] sm:rounded-[2rem] sm:p-8">
              <p className="text-elevated text-xs font-semibold uppercase tracking-[0.38em]">
                Create
              </p>
              <h2 className="text-elevated mt-2 font-[family:var(--font-display)] text-[2rem] leading-tight sm:text-4xl">
                Leave a note
              </h2>
              <p className="text-elevated mt-3 max-w-2xl text-[0.95rem] leading-7 sm:text-base">
                Take your time. Write something kind, honest, or hopeful, and
                let it wait here for the right day.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  href="/"
                  className="text-elevated inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-300/70 bg-white/45 px-6 py-3 text-sm font-semibold tracking-[0.18em] transition hover:border-sky-300 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px sm:min-h-0 sm:w-auto"
                >
                  Back Home
                </Link>
                <Link
                  href="/timeline"
                  className="text-elevated inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-[0.18em] transition hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px sm:min-h-0 sm:w-auto"
                >
                  View Timeline
                </Link>
              </div>
            </div>

            <div className="space-y-6 rounded-[1.5rem] border border-white/55 bg-white/42 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] sm:rounded-[2rem] sm:p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="title"
                    className="text-elevated text-[0.82rem] font-semibold uppercase tracking-[0.22em] sm:text-sm"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={form.title}
                    onChange={(event) => handleChange("title", event.target.value)}
                    placeholder="A promise for later"
                    className="w-full rounded-[1.25rem] border border-white/70 bg-white/75 px-4 py-3.5 text-[0.95rem] text-slate-800 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-200 sm:rounded-[1.5rem] sm:px-5 sm:py-4 sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="message"
                    className="text-elevated text-[0.82rem] font-semibold uppercase tracking-[0.22em] sm:text-sm"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={10}
                    value={form.message}
                    onChange={(event) => handleChange("message", event.target.value)}
                    placeholder="Write to your future self..."
                    className="w-full resize-none rounded-[1.25rem] border border-white/70 bg-white/75 px-4 py-3.5 text-[0.95rem] leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 sm:rounded-[1.5rem] sm:px-5 sm:py-4 sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="image"
                    className="text-elevated text-[0.82rem] font-semibold uppercase tracking-[0.22em] sm:text-sm"
                  >
                    Photos and Videos
                  </label>
                  <label
                    htmlFor="image"
                    className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-slate-300/80 bg-white/60 px-4 py-5 text-center transition hover:border-sky-300 hover:bg-white/85 sm:min-h-52 sm:rounded-[1.75rem] sm:px-5 sm:py-6"
                  >
                    {form.mediaItems.length > 0 ? (
                      <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {form.mediaItems.slice(0, 3).map((item) =>
                          item.type.startsWith("video/") ? (
                            <video
                              key={item.name}
                              src={item.dataUrl}
                              className="h-32 w-full rounded-[1.2rem] object-cover shadow-sm"
                            />
                          ) : (
                            <Image
                              key={item.name}
                              src={item.dataUrl}
                              alt={item.name}
                              width={320}
                              height={220}
                              unoptimized
                              className="h-32 w-full rounded-[1.2rem] object-cover shadow-sm"
                            />
                          )
                        )}
                        {form.mediaItems.length > 3 ? (
                          <div className="flex h-32 items-center justify-center rounded-[1.2rem] border border-white/60 bg-white/60 text-center">
                            <p className="text-elevated px-4 text-sm font-semibold">
                              +{form.mediaItems.length - 3} more files
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-elevated text-[0.95rem] font-semibold tracking-[0.16em] sm:text-sm">
                          Upload photos or videos
                        </p>
                        <p className="text-elevated text-[0.95rem] leading-6 sm:text-sm">
                          Optional. Add one or more visuals to hold the feeling
                          in place.
                        </p>
                      </div>
                    )}
                  </label>
                  <input
                    key={fileInputKey}
                    id="image"
                    name="image"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  {form.imageName ? (
                    <div className="flex flex-col gap-3 rounded-[1.25rem] bg-white/60 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:rounded-full">
                      <span className="min-w-0 truncate">{form.imageName}</span>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-elevated min-h-11 w-full shrink-0 rounded-full border border-white/60 px-4 py-2 text-center font-semibold tracking-[0.14em] transition hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px sm:min-h-0 sm:w-auto sm:border-0 sm:px-0 sm:py-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="unlockDate"
                    className="text-elevated text-[0.82rem] font-semibold uppercase tracking-[0.22em] sm:text-sm"
                  >
                    Unlock Date
                  </label>
                  <input
                    id="unlockDate"
                    name="unlockDate"
                    type="date"
                    required
                    min={today || undefined}
                    value={form.unlockDate}
                    onChange={(event) =>
                      handleChange("unlockDate", event.target.value)
                    }
                    className="w-full rounded-[1.25rem] border border-white/70 bg-white/75 px-4 py-3.5 text-[0.95rem] text-slate-800 outline-none transition focus:border-sky-200 sm:rounded-[1.5rem] sm:px-5 sm:py-4 sm:text-base"
                  />
                </div>

                <div className="rounded-[1.4rem] border border-white/50 bg-[linear-gradient(180deg,_rgba(248,244,236,0.95),_rgba(232,241,246,0.9))] p-4 sm:rounded-[1.75rem] sm:p-5">
                  <p className="text-elevated text-[0.82rem] font-semibold uppercase tracking-[0.18em] sm:text-sm">
                    Gentle reminder
                  </p>
                  <p className="text-elevated mt-3 text-[0.95rem] leading-7 sm:text-sm">
                    Your memory stays on this device for now. When you&apos;re ready,
                    we can make the timeline read from the same saved memories.
                  </p>
                </div>
              </div>
            </div>

            {saveMessage ? (
              <p className="rounded-[1.25rem] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-[0.95rem] leading-6 text-emerald-800 sm:rounded-[1.4rem] sm:px-5 sm:py-4 sm:text-sm">
                {saveMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-[1.25rem] border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-[0.95rem] leading-6 text-rose-700 sm:rounded-[1.4rem] sm:px-5 sm:py-4 sm:text-sm">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.95rem] leading-6 text-slate-500 sm:text-sm">
                Memories are saved in local storage on this browser.
              </p>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#f7c7b6] px-8 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition duration-300 hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b79f]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-14 sm:w-auto"
              >
                {isSaving ? "Saving..." : "Save Memory"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
