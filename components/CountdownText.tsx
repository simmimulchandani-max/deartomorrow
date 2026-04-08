'use client';

import { useEffect, useState } from "react";
import { formatCountdown, getCountdownParts, isValidUnlockDate } from "@/lib/countdown";

type CountdownTextProps = {
  unlockDate?: string | null;
  className?: string;
};

export default function CountdownText({
  unlockDate,
  className,
}: CountdownTextProps) {
  const [, setTick] = useState(0);

  if (typeof window !== "undefined") {
    console.log("Countdown unlockDate:", unlockDate);
  }

  useEffect(() => {
    if (!isValidUnlockDate(unlockDate)) {
      window.alert("Missing or invalid unlockDate for countdown.");
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextCountdown = getCountdownParts(unlockDate);

      setTick((currentTick) => currentTick + 1);

      if (nextCountdown.isUnlocked) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [unlockDate]);

  return (
    <span className={className}>
      {isValidUnlockDate(unlockDate) ? formatCountdown(unlockDate) : "0:00:00"}
    </span>
  );
}
