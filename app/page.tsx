import { Playfair_Display } from "next/font/google";
import Link from "next/link";

const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_46%,_#d6ebf5_100%)] px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-4%] h-72 w-72 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute right-[-8%] top-[10%] h-96 w-96 rounded-full bg-[#f8d8c9]/35 blur-3xl" />
        <div className="absolute left-[8%] top-[30%] h-44 w-44 rounded-full bg-[#fff2d8]/45 blur-2xl" />
        <div className="absolute right-[18%] top-[28%] h-36 w-36 rounded-full bg-sky-100/50 blur-2xl" />
        <div className="absolute bottom-[-18%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(236,221,194,0.88)_42%,_rgba(233,216,188,0)_75%)]" />
        <div className="absolute bottom-[12%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>

      <section className="relative w-full max-w-5xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[2.25rem] border border-white/60 bg-white/50 px-8 py-14 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:px-14 sm:py-20">
          <h1
            className={`${brandFont.className} text-elevated mt-6 text-6xl leading-[0.95] sm:text-7xl md:text-8xl`}
            style={{
              letterSpacing: "0.04em",
              textShadow:
                "0 2px 4px rgba(255,248,229,0.7), 0 6px 18px rgba(74,60,49,0.18)",
            }}
          >
            Until Tomorrow {/* new branding text */}
          </h1>
          <p className="text-elevated mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
            Leave something for your future self
          </p>
          <p className="text-elevated mt-4 max-w-xl text-sm leading-7 tracking-[0.02em] sm:text-base">
            Capture a feeling, a hope, or a small memory and let it wait for
            you like a note tucked into the tide.
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/create"
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-full bg-[#f7c7b6] px-7 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition duration-300 hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b79f]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
            >
              Create with Until Tomorrow {/* new branding text */}
            </Link>
            <Link
              href="/timeline"
              className="text-elevated inline-flex min-h-14 flex-1 items-center justify-center rounded-full border border-white/70 bg-white/55 px-7 text-sm font-semibold tracking-[0.18em] transition duration-300 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 active:translate-y-px"
            >
              View Until Tomorrow Timeline {/* new branding text */}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
