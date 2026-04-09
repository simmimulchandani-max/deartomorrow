"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isActive = true;
    let timeoutId: number | null = null;
    let unsubscribe: (() => void) | null = null;

    async function handleCallback() {
      // Check whether Supabase has established a session after the magic-link redirect.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (session) {
        router.replace("/timeline?celebrate=1");
        return;
      }

      // Fallback: wait briefly for auth state changes while Supabase processes the callback URL.
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!isActive) {
            return;
          }

          router.replace(nextSession ? "/timeline?celebrate=1" : "/");
        }
      );

      unsubscribe = () => authListener.subscription.unsubscribe();

      timeoutId = window.setTimeout(() => {
        if (isActive) {
          unsubscribe?.();
          router.replace("/");
        }
      }, 1500);
    }

    void handleCallback();

    return () => {
      isActive = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      unsubscribe?.();
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fff8e5_0%,_#f1e3c6_46%,_#d6ebf5_100%)] px-6 py-16">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white/55 px-8 py-10 text-center shadow-[0_30px_120px_rgba(88,110,124,0.16)] backdrop-blur-md">
        <p className="text-sm font-semibold tracking-[0.24em] text-[#4a3c31]">
          AUTHENTICATING
        </p>
        <h1 className="mt-4 text-3xl font-bold text-[#4a3c31]">
          Finishing your sign-in...
        </h1>
        <p className="mt-4 text-base leading-8 text-[#4a3c31]">
          We&apos;re checking your magic link and sending you to your timeline.
        </p>
      </div>
    </main>
  );
}
