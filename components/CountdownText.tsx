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
  const [label, setLabel] = useState("0:00:00");

  if (typeof window !== "undefined") {
    console.log("Countdown unlockDate:", unlockDate);
  }

  useEffect(() => {
    if (!isValidUnlockDate(unlockDate)) {
      setLabel("0:00:00");
      window.alert("Missing or invalid unlockDate for countdown.");
      return;
    }

    setLabel(formatCountdown(unlockDate));

    const intervalId = window.setInterval(() => {
      const nextCountdown = getCountdownParts(unlockDate);

      setLabel(formatCountdown(unlockDate));

      if (nextCountdown.isUnlocked) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [unlockDate]);

  return <span className={className}>{label}</span>;
}
