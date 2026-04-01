"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";

import unlockSound from "@/components/components/unlockSound";

export default function UnlockCelebration() {
  useEffect(() => {
    const audio = new Audio(unlockSound);
    audio.volume = 0.45;

    void audio.play().catch(() => {
      return undefined;
    });

    const duration = 1800;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 28,
      spread: 70,
      ticks: 220,
      zIndex: 60,
      colors: ["#f7c7b6", "#f4e6cc", "#dcebf4", "#fff8e5", "#98c1d9"],
    };

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        window.clearInterval(interval);
        return;
      }

      const particleCount = Math.max(12, Math.floor((timeLeft / duration) * 42));

      void confetti({
        ...defaults,
        particleCount,
        origin: {
          x: 0.18,
          y: 0.72,
        },
      });

      void confetti({
        ...defaults,
        particleCount,
        origin: {
          x: 0.82,
          y: 0.72,
        },
      });
    }, 260);

    return () => {
      window.clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return null;
}
