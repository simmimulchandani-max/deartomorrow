"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

type SoftLoginCelebrationProps = {
  active: boolean;
};

export default function SoftLoginCelebration({
  active,
}: SoftLoginCelebrationProps) {
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (!active || hasPlayedRef.current) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      hasPlayedRef.current = true;
      return;
    }

    // Soft login celebration: a small, warm burst instead of a full-screen effect.
    void confetti({
      particleCount: 28,
      spread: 42,
      startVelocity: 16,
      scalar: 0.72,
      ticks: 140,
      gravity: 0.85,
      origin: { x: 0.5, y: 0.16 },
      colors: ["#f7c7b6", "#f4bba8", "#f7f2e9", "#d6ebf5", "#4a3c31"],
      disableForReducedMotion: true,
    });

    hasPlayedRef.current = true;
  }, [active]);

  return null;
}
