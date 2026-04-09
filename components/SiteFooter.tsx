export default function SiteFooter() {
  return (
    <footer className="border-t border-white/50 bg-[rgba(247,242,233,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        {/* Shared footer branding */}
        <p className="text-sm font-semibold tracking-[0.16em] text-[#4a3c31]">
          Until Tomorrow
        </p>

        {/* Shared footer tagline */}
        <p className="text-sm leading-7 text-[#6f6055]">
          Capture a moment for your future self.
        </p>
      </div>
    </footer>
  );
}
