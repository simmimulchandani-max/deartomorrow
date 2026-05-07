"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";

const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default function Home() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSentLink, setHasSentLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      // Read the current Supabase session so logged-in visitors can go straight to their timeline.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      setHasSession(Boolean(session));
      setIsCheckingSession(false);
    }

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isActive) {
          return;
        }

        setHasSession(Boolean(session));
        setIsCheckingSession(false);
      }
    );

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleMagicLinkLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Supabase magic-link login. The redirect points back to the App Router callback page.
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setHasSentLink(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't send the login link just now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-9rem)] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_46%,_#d6ebf5_100%)] px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-[-18%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(236,221,194,0.88)_42%,_rgba(233,216,188,0)_75%)]" />
        <div className="absolute bottom-[12%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>

      <section className="relative w-full max-w-6xl">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
          <div className="rounded-[2rem] border border-white/60 bg-white/55 px-7 py-12 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:px-12 lg:text-left">
            <h1
              className={`${brandFont.className} text-elevated text-5xl leading-[0.98] sm:text-7xl md:text-8xl`}
              style={{
                letterSpacing: "0.04em",
                textShadow:
                  "0 2px 4px rgba(255,248,229,0.7), 0 6px 18px rgba(74,60,49,0.18)",
              }}
            >
              Until Tomorrow
            </h1>
            <p className="text-elevated mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
              Create a memory today, lock it until a future date, then come
              back later to relive it when the moment is ready.
            </p>
            <p className="text-elevated mt-4 max-w-2xl text-sm leading-7 tracking-[0.02em] sm:text-base">
              Save birthday notes, trip reflections, wedding wishes,
              milestone snapshots, or a message to your future self. Until
              Tomorrow keeps it tucked away until the date you choose.
            </p>

            <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
              {[
                ["1", "Write it now", "Capture the feeling while it is still close."],
                ["2", "Lock the date", "Pick the day it becomes available to open."],
                ["3", "Relive it later", "Return to a note that waited for you."],
              ].map(([step, title, copy]) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f7c7b6] text-sm font-bold text-[#4a3c31]">
                    {step}
                  </span>
                  <h2 className="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-[#4a3c31]">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6f6259]">{copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 w-full max-w-md lg:max-w-lg">
            {/* Homepage login buttons and feedback states */}
            {isCheckingSession ? (
              <div className="rounded-[1.75rem] border border-white/70 bg-white/60 px-6 py-6 text-center shadow-inner">
                <p className="text-elevated text-base leading-8 sm:text-lg">
                  Checking your session...
                </p>
              </div>
            ) : hasSession ? (
              <div className="rounded-[1.75rem] border border-white/70 bg-white/60 px-5 py-5 shadow-inner">
               <Link
                  href="/create"
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-7 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow-[0_16px_34px_rgba(74,60,49,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79a87] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
                >
                  Create
                </Link>
              </div>
            ) : hasSentLink ? (
              <div className="rounded-[1.75rem] border border-white/70 bg-white/60 px-6 py-6 text-center shadow-inner">
                {/* Friendly magic-link confirmation feedback */}
                <p className="text-elevated text-base leading-8 sm:text-lg">
                  Check your email — your link is on the way!
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleMagicLinkLogin}
                className="rounded-[1.75rem] border border-white/70 bg-white/60 px-5 py-5 shadow-inner"
              >
                <label
                  htmlFor="email"
                  className="text-elevated block text-left text-sm font-semibold tracking-[0.18em]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-3 min-h-14 w-full rounded-full border border-white/80 bg-white/90 px-5 text-base text-[#4a3c31] outline-none transition placeholder:text-[#8a786d] focus:border-[#f0b79f] focus:ring-2 focus:ring-[#f0b79f]/50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-7 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] shadow-[0_16px_34px_rgba(74,60,49,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79a87] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Sending Link..." : "Log In / Sign Up"}
                </button>
                {errorMessage ? (
                  <p className="mt-4 text-sm leading-7 text-[#9b4d3a]">
                    {errorMessage}
                  </p>
                ) : null}
              </form>
            )}
            </div>
          </div>

          <aside
            aria-label="Example unlocked memory"
            className="relative mx-auto w-full max-w-md px-2 sm:px-0"
          >
            <div className="rotate-[-1.5deg] rounded-[1.75rem] border border-[#eadfce] bg-[#fffaf2] p-4 shadow-[0_24px_80px_rgba(74,60,49,0.18)]">
              <div className="rounded-[1.25rem] bg-[linear-gradient(145deg,_#f7c7b6_0%,_#fff2d8_52%,_#d6ebf5_100%)] p-5">
                <div className="flex min-h-52 items-center justify-center rounded-[1rem] border border-white/60 bg-white/35">
                  <div className="text-center">
                    <span className="block text-5xl">+</span>
                    <span className="mt-3 block text-xs font-bold uppercase tracking-[0.2em] text-[#6b594d]">
                      Photo or video
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a786d]">
                    Unlocked
                  </p>
                  <p className="rounded-full border border-[#d7e6ee] bg-[#edf8fb] px-3 py-1 text-xs font-semibold text-[#4a6270]">
                    June 12, 2027
                  </p>
                </div>
                <h2
                  className={`${brandFont.className} mt-4 text-3xl leading-tight text-[#4a3c31]`}
                >
                  The morning after our first big trip
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#62544a]">
                  We promised we would remember how brave this felt: the
                  wrinkled map, the rain on the train window, and laughing
                  because none of it went exactly to plan.
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[#eadfce] pt-4 text-xs uppercase tracking-[0.16em] text-[#8a786d]">
                  <span>Memory opened</span>
                  <span>Until Tomorrow</span>
                </div>
              </div>
            </div>
            <div className="mx-auto mt-5 max-w-sm rounded-full border border-white/70 bg-white/45 px-5 py-3 text-center text-sm leading-6 text-[#5f5147] shadow-sm">
              A little time capsule for birthdays, trips, weddings,
              milestones, and future-you.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
