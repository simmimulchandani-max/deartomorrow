/** Capsule date fields are calendar dates in New York, never UTC instants. */
export const CAPSULE_TIME_ZONE = "America/New_York";

const calendarFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CAPSULE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function capsuleDateOnly(value: Date = new Date()) {
  const parts = calendarFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return [part("year"), part("month"), part("day")].join("-");
}

export function hasCapsuleUnlocked(
  unlockDate: string | null | undefined,
  now: Date = new Date()
) {
  return Boolean(unlockDate && unlockDate <= capsuleDateOnly(now));
}

/** Inclusive until the next New York calendar day, including DST changes. */
export function capsuleSubmissionsOpen(deadline: string, now: Date = new Date()) {
  return deadline >= capsuleDateOnly(now);
}
