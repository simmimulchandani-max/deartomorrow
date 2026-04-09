import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Route metadata for the About page
export const metadata = {
  title: "About | Until Tomorrow",
  description:
    "Learn the story behind Until Tomorrow and why it was created to hold memories for the future.",
  openGraph: {
    title: "About | Until Tomorrow",
    description:
      "Learn the story behind Until Tomorrow and why it was created to hold memories for the future.",
  },
  twitter: {
    title: "About | Until Tomorrow",
    description:
      "Learn the story behind Until Tomorrow and why it was created to hold memories for the future.",
  },
};

export default function AboutPage() {
  return (
    <main className="relative overflow-hidden bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_46%,_#d6ebf5_100%)] px-6 py-16 sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-4%] h-72 w-72 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute right-[-8%] top-[12%] h-96 w-96 rounded-full bg-[#f8d8c9]/35 blur-3xl" />
        <div className="absolute left-[10%] top-[32%] h-40 w-40 rounded-full bg-[#fff2d8]/40 blur-2xl" />
        <div className="absolute right-[16%] top-[26%] h-36 w-36 rounded-full bg-sky-100/45 blur-2xl" />
        <div className="absolute bottom-[-16%] left-1/2 h-80 w-[140%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(245,233,210,0.95)_0%,_rgba(236,221,194,0.88)_42%,_rgba(233,216,188,0)_75%)]" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col gap-10">
        {/* Hero section */}
        <section className="rounded-[2.25rem] border border-white/60 bg-white/50 px-8 py-12 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md sm:px-12 sm:py-16">
          <p className="text-elevated text-sm font-semibold tracking-[0.24em] uppercase">
            About Until Tomorrow
          </p>
          <h1
            className={`${brandFont.className} text-elevated mt-5 text-5xl leading-[0.98] sm:text-6xl md:text-7xl`}
            style={{
              letterSpacing: "0.03em",
              textShadow:
                "0 2px 4px rgba(255,248,229,0.7), 0 6px 18px rgba(74,60,49,0.18)",
            }}
          >
            Some feelings are too important to leave behind.
          </h1>
          <p className="text-elevated mx-auto mt-6 max-w-2xl text-base leading-8 sm:text-lg">
            Until Tomorrow is a place to leave a note for the person you are
            still becoming.
          </p>

          <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 shadow-inner">
            <img
              src="https://placehold.co/1200x700?text=Until+Tomorrow+Hero+Image"
              alt="Placeholder hero image for Until Tomorrow showing a nostalgic, reflective moment"
              className="h-auto w-full object-cover"
            />
          </div>
        </section>

        {/* What is Until Tomorrow section */}
        <section className="rounded-[2rem] border border-white/55 bg-white/45 px-8 py-10 shadow-[0_20px_80px_rgba(88,110,124,0.1)] backdrop-blur-sm sm:px-10">
          <h2 className={`${brandFont.className} text-elevated text-3xl sm:text-4xl`}>
            What is Until Tomorrow?
          </h2>
          <div className="mt-5 space-y-4 text-[#4a3c31]">
            <p className="text-base leading-8 sm:text-lg">
              It is part time capsule, part love letter, part quiet promise.
              You leave behind a memory, a message, a hope, a confession, a
              reminder, and let time hold it for a while.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              Some people use it to mark a season they never want to forget.
              Some use it when life feels heavy and they need to believe a
              future version of themselves will understand. Some just want to
              bottle up a night, a joke, a dream, or a version of who they are
              before it changes.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              Until Tomorrow exists for those moments when you want to say,
              &quot;I know this will mean something later.&quot;
            </p>
          </div>
        </section>

        {/* Origin story section */}
        <section className="rounded-[2rem] border border-white/55 bg-[#fffaf0]/70 px-8 py-10 shadow-[0_20px_80px_rgba(88,110,124,0.1)] backdrop-blur-sm sm:px-10">
          <p className="text-elevated text-sm font-semibold tracking-[0.22em] uppercase">
            How It Started
          </p>
          <h2 className={`${brandFont.className} text-elevated mt-3 text-3xl sm:text-4xl`}>
            A night in River Colony turned into a question that never really left.
          </h2>
          <div className="mt-6 space-y-5 text-[#4a3c31]">
            <p className="text-base leading-8 sm:text-lg">
              It started the way a lot of meaningful things do, without anyone
              realizing it at the time. A few friends were hanging out one
              night in River Colony, drifting through the kind of conversation
              that only happens when nobody is in a rush to go home. The hour
              got later. The stories got older. Somebody remembered a version
              of life that already felt far away.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              Nostalgia has a strange way of making a room feel warmer. They
              talked about how quickly people change, how whole chapters of life
              disappear before you even notice they are ending, and how badly we
              all wish we could leave something behind for ourselves before the
              moment slips past. Then the idea came out almost casually:
              what if you could send something forward? Not to the internet.
              Not to everybody. Just to your future self, waiting somewhere a
              little further down the road.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              At first it was just one of those beautiful late-night ideas,
              half joke, half truth. The kind you carry around for years
              without meaning to. But a few years later, one of them came back
              to it and thought maybe that feeling deserved a real place to
              live. Maybe people needed somewhere gentle to save the parts of
              themselves they were afraid time would blur.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              Until Tomorrow grew out of that moment: a conversation, a shared
              ache for the past, and a quiet decision to build something that
              could meet people exactly there.
            </p>
          </div>
        </section>

        {/* Mission and values section */}
        <section className="rounded-[2rem] border border-white/55 bg-white/45 px-8 py-10 shadow-[0_20px_80px_rgba(88,110,124,0.1)] backdrop-blur-sm sm:px-10">
          <p className="text-elevated text-sm font-semibold tracking-[0.22em] uppercase">
            Mission &amp; Values
          </p>
          <h2 className={`${brandFont.className} text-elevated mt-3 text-3xl sm:text-4xl`}>
            We built it for memory, honesty, and the soft courage of looking back.
          </h2>
          <div className="mt-6 space-y-4 text-[#4a3c31]">
            <p className="text-base leading-8 sm:text-lg">
              Until Tomorrow matters because life moves fast, even when it feels
              slow. We lose versions of ourselves all the time. This is one
              small way to stay in conversation with them.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              The hope is simple: that when someone opens what they left behind,
              they feel seen. Maybe they laugh. Maybe they cry. Maybe they
              realize they made it through something they once thought would
              last forever. Maybe they remember a dream they still want to keep.
            </p>
            <p className="text-base leading-8 sm:text-lg">
              Visitors gain more than a saved note. They get a pause. A mirror.
              A breadcrumb trail back to a feeling that mattered. And sometimes,
              that is enough to remind a person who they were, who they are,
              and who they still want to be.
            </p>
          </div>
        </section>

        {/* Call to action section */}
        <section className="rounded-[2rem] border border-white/60 bg-[#4a3c31]/88 px-8 py-10 text-center text-white shadow-[0_24px_90px_rgba(74,60,49,0.22)] sm:px-10">
          <h2 className={`${brandFont.className} text-3xl sm:text-4xl`}>
            Leave something for later.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
            Start a memory, revisit your timeline, and let tomorrow meet the
            version of you who chose to remember this.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/timeline"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f7c7b6] px-7 text-sm font-semibold tracking-[0.18em] text-[#4a3c31] transition duration-300 hover:bg-[#f4bba8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a3c31]"
            >
              Visit the Timeline
            </Link>
            <Link
              href="/create"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-7 text-sm font-semibold tracking-[0.18em] text-white transition duration-300 hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a3c31]"
            >
              Start Your Message
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
