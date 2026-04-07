export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
  isValid: boolean;
};

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

export function isValidUnlockDate(unlockDate?: string | null) {
  if (!unlockDate) {
    return false;
  }

  const unlockTime = new Date(unlockDate).getTime();
  return !Number.isNaN(unlockTime);
}

function getZeroCountdownParts(isValid: boolean): CountdownParts {
  return {
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isUnlocked: true,
    isValid,
  };
}

export function getCountdownParts(unlockDate?: string | null): CountdownParts {
  if (!isValidUnlockDate(unlockDate)) {
    return getZeroCountdownParts(false);
  }

  const unlockTime = new Date(unlockDate!).getTime();

  const diff = unlockTime - Date.now();
  const safeDiff = Math.max(diff, 0);

  const days = Math.floor(safeDiff / DAY_IN_MS);
  const hours = Math.floor((safeDiff % DAY_IN_MS) / HOUR_IN_MS);
  const minutes = Math.floor((safeDiff % HOUR_IN_MS) / MINUTE_IN_MS);
  const seconds = Math.floor((safeDiff % MINUTE_IN_MS) / SECOND_IN_MS);

  return {
    totalMs: diff,
    days,
    hours,
    minutes,
    seconds,
    isUnlocked: diff <= 0,
    isValid: true,
  };
}

export function formatCountdownParts(countdown: CountdownParts) {
  if (!countdown.isValid || countdown.isUnlocked) {
    return "0:00:00";
  }

  return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
}

export function formatCountdown(unlockDate?: string | null) {
  return formatCountdownParts(getCountdownParts(unlockDate));
}

export function hasCountdownExpired(unlockDate?: string | null) {
  return getCountdownParts(unlockDate).isUnlocked;
}
