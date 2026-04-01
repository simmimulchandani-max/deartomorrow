type MemoryCardProps = {
  message: string;
  name: string;
  createdAtLabel: string;
  tiltClassName: string;
};

export default function MemoryCard({
  message,
  name,
  createdAtLabel,
  tiltClassName,
}: MemoryCardProps) {
  return (
    <article
      className={`relative mx-auto w-full max-w-sm bg-white p-5 pb-8 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-stone-200/70 transition duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${tiltClassName}`}
    >
      <div className="absolute left-1/2 top-3 h-8 w-20 -translate-x-1/2 rotate-[-2deg] rounded-sm bg-[#f5e6b8]/85 shadow-sm" />

      <div className="relative border border-stone-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#fffdf8_100%)] px-5 pb-5 pt-12">
        <p className="whitespace-pre-wrap text-base leading-8 text-slate-700">
          {message}
        </p>

        <div className="mt-8 border-t border-dashed border-stone-200 pt-4">
          <p className="font-[family:var(--font-handwritten)] text-3xl text-slate-700">
            {name || "Anonymous"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
            {createdAtLabel}
          </p>
        </div>
      </div>
    </article>
  );
}
