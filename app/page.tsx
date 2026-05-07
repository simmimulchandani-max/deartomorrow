"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";

const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const useCases = [
  ["Birthdays", "Save a note, photo, or wish to open later."],
  ["Trips", "Capture the little details you never want to forget."],
  ["Weddings", "Collect love notes for the couple to open later."],
  ["Future self", "Write something future-you will need to hear."],
];

const steps = [
  ["1", "Create it", "Write a note, add photos or videos, and choose a future unlock date."],
  ["2", "Lock it", "Your memory stays tucked away until the date you picked."],
  ["3", "Feel it again", "When it unlocks, come back to relive the moment."],
];

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) return;

      setHasSession(Boolean(session));
      setIsCheckingSession(false);
    }

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isActive) return;

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
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

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
    <main className="relative min-h-[calc(100vh-9rem)] overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_42%,_#d6ebf5_100%)] px-6 py-12 text-[#4a3c31] sm:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#f7c7b6]/35 blur-3xl" />
        <div className="absolute bottom-[-18%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(236,221,194,0.88)_42%,_rgba(233,216,188,0)_75%)]" />
        <div className="absolute bottom-[12%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      </div>

      <section className="relative mx-auto w-full max-w-7xl">
        <div className="rounded-[2.25rem] border border-white/60 bg-white/55 px-6 py-8 shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:px-10 sm:py-10 lg:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
            <div className="text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#8a786d]">
                Until Tomorrow
              </p>

              <h1
                className={`${brandFont.className} mt-4 text-5xl leading-[0.98] text-[#4a3c31] sm:text-6xl md:text-7xl`}
                style={{
                  letterSpacing: "0.01em",
                  textShadow:
                    "0 2px 4px rgba(255,248,229,0.7), 0 6px 18px rgba(74,60,49,0.16)",
                }}
              >
                Some moments deserve to be felt twice.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5f5147] sm:text-xl lg:mx-0">
                Create a memory today, lock it until a future date, and reopen it
                when the moment is ready to be remembered.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 tracking-[0.02em] text-[#6f6259] sm:text-base lg:mx-0">
                Save birthday notes, trip reflections, wedding wishes, milestone
                snapshots, or a message to your future self.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                {steps.map(([step, title, copy]) => (
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
                    <p className="mt-2 text-sm leading-6 text-[#6f6259]">
                      {copy}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 w-full max-w-md lg:max-w-lg">
                {isCheckingSession ? (
                  <div className="rounded-[1.75rem] border border-white/70 bg-white/60 px-6 py-6 text-center shadow-inner">
                    <p className="text-base leading-8 text-[#5f5147] sm:text-lg">
                      Checking your session...
                    </p>
                  </div>
                ) : hasSession ? (
                  <div className="rounded-[1.75rem] border border-white/70 bg-white/60 px-5 py-5 shadow-inner">
                    <Link
                      href="/create"
                      className="inline-flex min-h-14 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-7 text-sm font-bold uppercase tracking-[0.18em] text-[#4a3c31] shadow-[0_16px_34px_rgba(74,60,49,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f4bba8]"
                    >
                      Create a Memory
                    </Link>
                  </div>
                ) : hasSentLink ? (
                  <div className="rounded-[1.75rem] border border-white/70 bg-white/60 px-6 py-6 text-center shadow-inner">
                    <p className="text-base leading-8 text-[#5f5147] sm:text-lg">
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
                      className="block text-left text-sm font-semibold uppercase tracking-[0.18em] text-[#4a3c31]"
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
                      className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full border border-[#e7b6a4] bg-[#f7c7b6] px-7 text-sm font-bold uppercase tracking-[0.18em] text-[#4a3c31] shadow-[0_16px_34px_rgba(74,60,49,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f4bba8] disabled:cursor-not-allowed disabled:opacity-70"
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

            <aside aria-label="Example unlocked memory" className="mx-auto w-full max-w-md">
              <div className="rotate-[-1.5deg] rounded-[1.75rem] border border-[#eadfce] bg-[#fffaf2] p-4 shadow-[0_24px_80px_rgba(74,60,49,0.18)] transition duration-500 hover:rotate-0 hover:scale-[1.01]">
                <div className="overflow-hidden rounded-[1.25rem] bg-[linear-gradient(145deg,_#f7c7b6_0%,_#fff2d8_52%,_#d6ebf5_100%)] p-4">
                  <div className="relative flex min-h-56 items-end overflow-hidden rounded-[1rem] border border-white/60 bg-[radial-gradient(circle_at_18%_20%,_#fff7d7_0%,_transparent_24%),linear-gradient(145deg,_#f4ad8d_0%,_#f7d9a6_42%,_#8fc6d8_100%)] p-5">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,_transparent_0%,_rgba(74,60,49,0.20)_100%)]" />
                    <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-[#fff4bd]/80 blur-sm" />
                    <div className="absolute bottom-0 left-0 right-0 h-24 rounded-t-[100%] bg-[#f7ead1]/70" />
                    <div className="relative rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#5f5147] backdrop-blur">
                      Beach sunset memory
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="rounded-full bg-[#f7c7b6]/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#4a3c31]">
                      Unlocked
                    </p>
                    <p className="rounded-full border border-[#d7e6ee] bg-[#edf8fb] px-3 py-1 text-xs font-semibold text-[#4a6270]">
                      July 18, 2026
                    </p>
                  </div>

                  <h2 className={`${brandFont.className} mt-4 text-3xl leading-tight text-[#4a3c31]`}>
                    Summer in Montauk
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[#62544a]">
                    I hope this brings you right back to the sound of the waves,
                    the late-night laughs, and the feeling that life was exactly
                    where it needed to be.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/65 bg-white/50 p-6 shadow-[0_20px_70px_rgba(88,110,124,0.10)] backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8a786d]">
              Memory
            </p>
            <h2 className={`${brandFont.className} mt-3 text-3xl text-[#4a3c31]`}>
              A private time capsule for your future self.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6f6259]">
              Save a note, photo, video, or feeling that only you can open when
              the time is right.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/65 bg-white/50 p-6 shadow-[0_20px_70px_rgba(88,110,124,0.10)] backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8a786d]">
              Capsule
            </p>
            <h2 className={`${brandFont.className} mt-3 text-3xl text-[#4a3c31]`}>
              A shared collection of memories from people you love.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#6f6259]">
              Invite friends or family to contribute messages for birthdays,
              weddings, trips, and once-in-a-lifetime moments.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/65 bg-white/45 p-6 shadow-[0_20px_70px_rgba(88,110,124,0.10)] backdrop-blur sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8a786d]">
              Made for the moments you’ll want to revisit
            </p>
            <h2 className={`${brandFont.className} mt-3 text-4xl leading-tight text-[#4a3c31] sm:text-5xl`}>
              Turn today into something beautiful to open later.
            </h2>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map(([title, copy]) => (
              <div
                key={title}
                className="rounded-3xl border border-white/70 bg-white/55 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/70"
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[#4a3c31]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#6f6259]">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}