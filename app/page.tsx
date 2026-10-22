"use client";

import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import {
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { trackEvent } from "@/lib/analytics";
import { getSupabaseClient } from "@/lib/supabaseClient";

const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

function StepIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f7c7b6] text-[#4a3c31] sm:h-11 sm:w-11">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

const steps = [
  {
    title: "Create It",
    copy: "Save photos, videos, or messages.",
    icon: (
      <StepIcon>
        <path d="M4 6.5h16v12H4zM7.5 14l2.5-2.5 2.5 2 2.5-3 3.5 4.5M9 9.5h.01" />
      </StepIcon>
    ),
  },
  {
    title: "Lock It",
    copy: "Pick a future date.",
    icon: (
      <StepIcon>
        <path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6z" />
      </StepIcon>
    ),
  },
  {
    title: "Feel It Again",
    copy: "Relive the moment when it’s time.",
    icon: (
      <StepIcon>
        <path d="M20.8 8.6c0 5.2-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.6A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8.8 1.2Z" />
      </StepIcon>
    ),
  },
];

const polaroids = [
  {
    src: "/images/homepage/dog walk.png",
    alt: "A golden retriever on a sunny neighborhood walk",
    rotation: "-rotate-[3deg]",
    position: "object-center",
  },
  {
    src: "/images/homepage/nyc.png",
    alt: "The New York City skyline beneath a vivid sunset",
    rotation: "rotate-[2deg]",
    position: "object-center",
  },
  {
    src: "/images/homepage/1.jpg",
    alt: "A father sharing a family meal with two children",
    rotation: "-rotate-[1deg]",
    position: "object-[center_48%]",
  },
  {
    src: "/images/homepage/2.png",
    alt: "A quiet sunset moment on the beach",
    rotation: "rotate-[3deg]",
    position: "object-[center_58%]",
  },
  {
    src: "/images/homepage/3.jpg",
    alt: "Friends celebrating together in colorful traditional clothing",
    rotation: "-rotate-[2deg]",
    position: "object-[center_48%]",
  },
  {
    src: "/images/homepage/4.png",
    alt: "Friends laughing together over a sunlit meal",
    rotation: "rotate-[1deg]",
    position: "object-center",
  },
];

export default function Home() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSentLink, setHasSentLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [submittingType, setSubmittingType] = useState<
    "memory" | "capsule" | null
  >(null);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setIsCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setHasSession(Boolean(session));
        setIsCheckingSession(false);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleMagicLinkLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const creationType =
      submitter?.value === "capsule" ? "capsule" : "memory";
    const destination =
      creationType === "capsule" ? "/create/capsule" : "/create/memory";

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      emailInputRef.current?.focus();
      return;
    }

    trackEvent("homepage_create_memory_clicked", {
      cta_location: "homepage_hero",
      creation_type: creationType,
    });
    trackEvent("login_started", {
      login_method: "magic_link",
      source: "homepage_hero",
      creation_type: creationType,
    });
    setIsSubmitting(true);
    setSubmittingType(creationType);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
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
      setSubmittingType(null);
    }
  }

  function focusSignIn() {
    document.getElementById("hero-sign-in")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    window.setTimeout(() => emailInputRef.current?.focus(), 250);
  }

  return (
    <main className="overflow-hidden bg-[#fffaf0] text-[#4a3c31]">
      <section className="px-4 pb-10 pt-7 sm:px-6 sm:pb-12 sm:pt-10 lg:pb-14 lg:pt-12">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.86fr)] lg:gap-12">
          <div className="min-w-0 text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8a786d]">
              A memory, waiting for you
            </p>
            <h1
              className={`${brandFont.className} mx-auto mt-3 max-w-2xl text-[2.55rem] leading-[1.04] tracking-[-0.025em] sm:text-5xl md:text-6xl lg:mx-0 lg:text-[4.4rem]`}
            >
              Some moments deserve to be felt twice.
            </h1>
            <p className="mx-auto mt-[1.1rem] max-w-xl text-base leading-7 text-[#66584e] sm:mt-5 sm:text-lg sm:leading-8 lg:mx-0">
              Save today&apos;s photos, videos, and messages. Unlock them on a
              future date and relive the moments that matter.
            </p>

            <div id="hero-sign-in" className="mx-auto mt-[1.3rem] w-full max-w-md scroll-mt-28 sm:mt-6 lg:mx-0">
              {isCheckingSession ? (
                <div
                  className="rounded-2xl border border-[#eadfce] bg-white px-5 py-5 text-center text-sm text-[#66584e] shadow-sm"
                  role="status"
                >
                  Checking your session…
                </div>
              ) : hasSession ? (
                <CreationLinks location="homepage_hero_authenticated" />
              ) : hasSentLink ? (
                <div
                  className="rounded-2xl border border-[#eadfce] bg-white px-5 py-5 text-center shadow-sm"
                  role="status"
                >
                  <p className="font-semibold">Check your email — your secure link is on the way.</p>
                  <p className="mt-1 text-sm text-[#6f6259]">You can safely close this page.</p>
                </div>
              ) : (
                <form onSubmit={handleMagicLinkLogin}>
                  <label htmlFor="homepage-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    ref={emailInputRef}
                    id="homepage-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your email address"
                    autoComplete="email"
                    aria-describedby="sign-in-note"
                    className="min-h-12 w-full rounded-full border border-[#d9cdbd] bg-white px-5 text-base text-[#4a3c31] shadow-sm outline-none placeholder:text-[#938278] focus:border-[#e7b6a4] focus:ring-2 focus:ring-[#e7b6a4]/45"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="submit"
                      name="creationType"
                      value="memory"
                      disabled={isSubmitting}
                      className="cta-button min-w-0 px-2 text-[0.72rem] tracking-normal disabled:cursor-not-allowed disabled:opacity-65 min-[375px]:text-xs sm:px-3 sm:text-sm"
                    >
                      {submittingType === "memory" ? "Sending…" : <><span className="sm:hidden">Memory&nbsp;→</span><span className="hidden sm:inline">Create a Memory&nbsp;→</span></>}
                    </button>
                    <button
                      type="submit"
                      name="creationType"
                      value="capsule"
                      disabled={isSubmitting}
                      className="cta-button-secondary min-w-0 px-2 text-[0.72rem] tracking-normal disabled:cursor-not-allowed disabled:opacity-65 min-[375px]:text-xs sm:px-3 sm:text-sm"
                    >
                      {submittingType === "capsule" ? "Sending…" : <><span className="sm:hidden">Capsule&nbsp;→</span><span className="hidden sm:inline">Create a Capsule&nbsp;→</span></>}
                    </button>
                  </div>
                  <p id="sign-in-note" className="mt-2.5 text-center text-xs leading-5 text-[#75675d]">
                    We&apos;ll email you a secure sign-in link. No password needed.
                  </p>
                  {errorMessage ? (
                    <p className="mt-2 text-center text-sm text-[#9b4d3a]" role="alert">
                      {errorMessage}
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          </div>

          <div className="mx-auto min-w-0 w-full max-w-md lg:max-w-none">
            <PolaroidCollage />
          </div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="border-y border-[#eadfce] bg-white/65 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <h2 id="how-title" className={`${brandFont.className} text-center text-3xl sm:text-4xl`}>
            How It Works
          </h2>
          <div className="mt-7 grid grid-cols-3 gap-3 sm:gap-8">
            {steps.map((step) => (
              <article key={step.title} className="min-w-0 text-center">
                {step.icon}
                <h3 className="mt-3 text-xs font-bold uppercase leading-4 tracking-[0.08em] sm:text-base sm:tracking-[0.12em]">
                  {step.title}
                </h3>
                <p className="mx-auto mt-1.5 max-w-48 text-[0.7rem] leading-4 text-[#6f6259] sm:mt-2 sm:text-sm sm:leading-6">
                  {step.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#eadfce] bg-[#fffaf0] px-4 py-9 text-center sm:px-6 sm:py-11">
        <div className="mx-auto max-w-2xl">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#8a786d]">
            Memories are better together
          </p>
          <h2 className={`${brandFont.className} mt-2 text-3xl leading-tight sm:text-4xl`}>
            Some memories are meant to be shared.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#66584e] sm:text-base sm:leading-7">
            Create a group time capsule for birthdays, weddings, or just because.
            Invite friends and family to add photos, videos, and messages, then
            open the collection on a future date.
          </p>
          {hasSession ? (
            <Link
              href="/create/capsule"
              onClick={() =>
                trackEvent("homepage_create_memory_clicked", {
                  cta_location: "homepage_group_capsule",
                  creation_type: "capsule",
                })
              }
              className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#7d5142] underline decoration-[#e7b6a4] decoration-2 underline-offset-4 hover:text-[#4a3c31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7b6a4]"
            >
              Create a Group Capsule <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={focusSignIn}
              className="mt-4 min-h-11 text-sm font-bold text-[#7d5142] underline decoration-[#e7b6a4] decoration-2 underline-offset-4 hover:text-[#4a3c31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7b6a4]"
            >
              Create a Group Capsule <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </section>

      <section className="bg-[#f4e8d5] px-4 py-10 text-center sm:px-6 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${brandFont.className} text-3xl leading-tight sm:text-5xl`}>
            Don&apos;t let the moment just live in your camera roll.
          </h2>
          <button type="button" onClick={focusSignIn} className="cta-button mx-auto mt-6 max-w-sm">
            Create Your First Memory <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>
  );
}

function CreationLinks({ location }: { location: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <Link
        href="/create/memory"
        onClick={() =>
          trackEvent("homepage_create_memory_clicked", {
            cta_location: location,
            creation_type: "memory",
          })
        }
        className="cta-button min-w-0 px-2 text-[0.72rem] tracking-normal min-[375px]:text-xs sm:px-3 sm:text-sm"
      >
        <span className="sm:hidden">Memory&nbsp;→</span><span className="hidden sm:inline">Create a Memory&nbsp;→</span>
      </Link>
      <Link
        href="/create/capsule"
        onClick={() =>
          trackEvent("homepage_create_memory_clicked", {
            cta_location: location,
            creation_type: "capsule",
          })
        }
        className="cta-button-secondary min-w-0 px-2 text-[0.72rem] tracking-normal min-[375px]:text-xs sm:px-3 sm:text-sm"
      >
        <span className="sm:hidden">Capsule&nbsp;→</span><span className="hidden sm:inline">Create a Capsule&nbsp;→</span>
      </Link>
    </div>
  );
}

function PolaroidCollage() {
  return (
    <div
      className="grid grid-cols-3 items-center gap-x-2 gap-y-3 px-1 py-1 sm:gap-x-3 sm:gap-y-4 lg:px-2"
      aria-label="A collection of six cherished moments"
    >
      {polaroids.map((photo, index) => (
        <figure
          key={photo.src}
          className={`min-w-0 bg-[#fffdf7] p-1.5 pb-3 shadow-[0_7px_18px_rgba(74,60,49,0.13)] sm:p-2 sm:pb-4 ${photo.rotation}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-[#eadfce]">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              preload={index === 1}
              sizes="(max-width: 639px) 29vw, (max-width: 1023px) 140px, 150px"
              className={`object-cover ${photo.position}`}
            />
          </div>
        </figure>
      ))}
    </div>
  );
}
