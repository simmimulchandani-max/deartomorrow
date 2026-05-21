'use client';

import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

const FEEDBACK_RATINGS = ["🙂", "😐", "😡"] as const;

function getUserInitials(user: User) {
  const emailName = user.email?.split("@")[0] ?? "";
  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : emailName;
  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [feedbackRating, setFeedbackRating] =
    useState<(typeof FEEDBACK_RATINGS)[number]>("🙂");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackScreenshot, setFeedbackScreenshot] = useState<File | null>(
    null
  );
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsUserMenuOpen(false);
        setIsFeedbackOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let supabase: ReturnType<typeof getSupabaseClient>;

    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (isActive) {
        setUser(currentUser);
      }
    }

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isActive) {
          setUser(session?.user ?? null);
          setIsUserMenuOpen(false);
        }
      }
    );

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  function closeMenu() {
    setIsOpen(false);
  }

  function openFeedbackModal() {
    setFeedbackEmail(user?.email ?? "");
    setFeedbackStatus("");
    setFeedbackError("");
    setIsUserMenuOpen(false);
    setIsFeedbackOpen(true);
  }

  function closeFeedbackModal() {
    if (isSubmittingFeedback) return;
    setIsFeedbackOpen(false);
  }

  async function uploadFeedbackScreenshot(
    screenshot: File,
    accessToken: string
  ) {
    const targetResponse = await fetch("/api/feedback/upload-target", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          name: screenshot.name,
          type: screenshot.type,
          size: screenshot.size,
        },
      }),
    });
    const targetPayload = (await targetResponse.json().catch(() => null)) as {
      error?: string;
      signedUrl?: string;
      publicUrl?: string;
      contentType?: string;
    } | null;

    if (!targetResponse.ok || !targetPayload?.signedUrl) {
      throw new Error(
        targetPayload?.error ?? "Could not prepare screenshot upload."
      );
    }

    const uploadResponse = await fetch(targetPayload.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type":
          targetPayload.contentType || screenshot.type || "image/png",
      },
      body: screenshot,
    });

    if (!uploadResponse.ok) {
      throw new Error("Screenshot upload failed.");
    }

    return targetPayload.publicUrl ?? null;
  }

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackStatus("");
    setFeedbackError("");

    const email = feedbackEmail.trim();
    const title = feedbackTitle.trim();
    const description = feedbackDescription.trim();

    if (!email || !title || !description) {
      setFeedbackError("Email, title, and description are required.");
      return;
    }

    setIsSubmittingFeedback(true);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("Please log in again before sending feedback.");
      }

      const screenshotUrl = feedbackScreenshot
        ? await uploadFeedbackScreenshot(
            feedbackScreenshot,
            session.access_token
          )
        : null;

      const { error } = await supabase.from("feedback").insert({
        user_id: session.user.id,
        email,
        title,
        description,
        rating: feedbackRating,
        screenshot_url: screenshotUrl,
      });

      if (error) {
        throw error;
      }

      setFeedbackStatus("Feedback sent. Thank you.");
      setFeedbackTitle("");
      setFeedbackDescription("");
      setFeedbackScreenshot(null);
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Feedback could not be sent. Please try again."
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  async function handleLogout() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsUserMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#eadfce] bg-[#F5F0E6]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-24 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#ded7cd] bg-white shadow-sm">
            <Image
              src="/favicon.png"
              alt="Until Tomorrow logo"
              width={34}
              height={34}
              className="h-auto w-auto"
              priority
            />
          </div>
          <span className="text-[2rem] font-semibold tracking-[-0.02em] text-[#4a3c31] sm:text-[2.2rem]">
            Until Tomorrow
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                aria-label="Open user menu"
                aria-expanded={isUserMenuOpen}
                onClick={() => {
                  setIsUserMenuOpen((current) => !current);
                  setIsOpen(false);
                }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#ded7cd] bg-white text-sm font-bold uppercase tracking-[0.08em] text-[#4a3c31] shadow-sm transition hover:bg-[#fffaf2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a3c31]"
              >
                {getUserInitials(user)}
              </button>

              {isUserMenuOpen ? (
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[2rem] border border-[#eadfce] bg-[#F5F0E6] p-3 shadow-[0_24px_60px_rgba(74,60,49,0.18)]">
                  <p className="truncate rounded-2xl px-5 py-4 text-sm font-semibold text-[#4a3c31]">
                    {user.email}
                  </p>
                  <button
                    type="button"
                    onClick={openFeedbackModal}
                    className="block w-full rounded-2xl px-5 py-4 text-left text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
                  >
                    Send feedback
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-2xl px-5 py-4 text-left text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={isOpen}
              onClick={() => {
                setIsOpen((current) => !current);
                setIsUserMenuOpen(false);
              }}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] text-[#4a3c31] shadow-md transition hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a3c31]"
            >
              <span className="sr-only">Menu</span>
              <div className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </div>
            </button>

            {isOpen ? (
              <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[2rem] border border-[#eadfce] bg-[#F5F0E6] p-3 shadow-[0_24px_60px_rgba(74,60,49,0.18)]">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
                >
                  Home
                </Link>
                <Link
                  href="/timeline"
                  onClick={closeMenu}
                  className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
                >
                  Timeline
                </Link>
                <Link
                  href="/create"
                  onClick={closeMenu}
                  className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
                >
                  Create
                </Link>
                <Link
                  href="/about"
                  onClick={closeMenu}
                  className="block rounded-2xl px-5 py-4 text-lg font-semibold tracking-[0.08em] text-[#4a3c31] transition hover:bg-[#f7c7b6]"
                >
                  About
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isFeedbackOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#4a3c31]/35 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <form
            onSubmit={handleFeedbackSubmit}
            className="w-full max-w-lg rounded-[2rem] border border-[#eadfce] bg-[#F5F0E6] p-5 shadow-[0_24px_60px_rgba(74,60,49,0.24)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="feedback-title"
                  className="text-2xl font-semibold text-[#4a3c31]"
                >
                  Send feedback
                </h2>
                <p className="mt-1 text-sm text-[#6f6259]">
                  Tell us what happened.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFeedbackModal}
                disabled={isSubmittingFeedback}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ded7cd] bg-white text-lg font-semibold text-[#4a3c31] transition hover:bg-[#fffaf2] disabled:opacity-60"
                aria-label="Close feedback modal"
              >
                x
              </button>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#4a3c31]">Rating</p>
              <div className="mt-2 flex gap-2">
                {FEEDBACK_RATINGS.map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFeedbackRating(rating)}
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-2xl transition ${
                      feedbackRating === rating
                        ? "border-[#e7b6a4] bg-[#f7c7b6]"
                        : "border-[#ded7cd] bg-white hover:bg-[#fffaf2]"
                    }`}
                    aria-label={`Rate ${rating}`}
                    aria-pressed={feedbackRating === rating}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block text-sm font-semibold text-[#4a3c31]">
              Email
              <input
                type="email"
                required
                value={feedbackEmail}
                onChange={(event) => setFeedbackEmail(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#ded7cd] bg-white px-4 text-base font-normal text-[#4a3c31] outline-none focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#4a3c31]">
              Title
              <input
                type="text"
                required
                value={feedbackTitle}
                onChange={(event) => setFeedbackTitle(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#ded7cd] bg-white px-4 text-base font-normal text-[#4a3c31] outline-none focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-[#4a3c31]">
              Description
              <textarea
                required
                value={feedbackDescription}
                onChange={(event) =>
                  setFeedbackDescription(event.target.value)
                }
                rows={5}
                className="mt-2 w-full resize-y rounded-2xl border border-[#ded7cd] bg-white px-4 py-3 text-base font-normal text-[#4a3c31] outline-none focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
              />
            </label>

            <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#ded7cd] bg-white px-5 py-3 text-sm font-semibold text-[#4a3c31] transition hover:bg-[#fffaf2]">
              Upload screenshot
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  setFeedbackScreenshot(event.target.files?.[0] ?? null)
                }
              />
            </label>
            {feedbackScreenshot ? (
              <p className="mt-2 truncate text-sm text-[#6f6259]">
                {feedbackScreenshot.name}
              </p>
            ) : null}

            {feedbackError ? (
              <p className="mt-4 rounded-2xl border border-[#e7b6a4] bg-white px-4 py-3 text-sm text-[#9b4d3a]">
                {feedbackError}
              </p>
            ) : null}

            {feedbackStatus ? (
              <p className="mt-4 rounded-2xl border border-[#ded7cd] bg-white px-4 py-3 text-sm text-[#4a3c31]">
                {feedbackStatus}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmittingFeedback}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-6 text-sm font-bold uppercase tracking-[0.16em] text-[#4a3c31] transition hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmittingFeedback ? "Sending..." : "Submit feedback"}
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
