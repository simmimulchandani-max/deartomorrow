import { hasCapsuleUnlocked } from "@/lib/capsuleDates";

export type CapsuleDateEditingFields = {
  unlock_date: string;
  capsule_unlock_email_sent_at?: string | null;
  unlock_email_sent_at?: string | null;
  recipient_email_sent_at?: string | null;
  owner_gift_confirmation_sent_at?: string | null;
  unlock_email_attempted_at?: string | null;
};

/** Advisory UI state; the server and database recheck eligibility on every save. */
export function capsuleDateEditBlockedReason(
  capsule: CapsuleDateEditingFields,
  now: Date = new Date()
): string | null {
  if (hasCapsuleUnlocked(capsule.unlock_date, now)) {
    return "Dates cannot be changed after this capsule has unlocked.";
  }
  if (
    capsule.capsule_unlock_email_sent_at ||
    capsule.unlock_email_sent_at ||
    capsule.recipient_email_sent_at ||
    capsule.owner_gift_confirmation_sent_at
  ) {
    return "Dates cannot be changed because an unlock notification or gift delivery confirmation has already been sent.";
  }
  if (
    capsule.unlock_email_attempted_at &&
    new Date(capsule.unlock_email_attempted_at).getTime() >= now.getTime() - 15 * 60 * 1000
  ) {
    return "An email attempt is in progress. Please try again in 15 minutes.";
  }
  return null;
}
