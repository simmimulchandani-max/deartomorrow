import UnlockCapsuleEmail from "@/emails/UnlockCapsuleEmail";
import GiftCapsuleOwnerConfirmationEmail from "@/emails/GiftCapsuleOwnerConfirmationEmail";
import GiftCapsuleRecipientEmail from "@/emails/GiftCapsuleRecipientEmail";
import UnlockMemoryEmail from "@/emails/UnlockMemoryEmail";

export function buildMemoryUnlockEmailTemplate(input: {
  logoUrl: string;
  memoryTitle: string;
  unlockDate: string;
  unlockUrl: string;
  previewImageUrl?: string | null;
}) {
  const title = input.memoryTitle.trim() || "Untitled Memory";

  return {
    react: <UnlockMemoryEmail {...input} memoryTitle={title} />,
    text: [
      "Your memory is waiting for you",
      "",
      "A memory you saved for your future self is ready to be opened.",
      "",
      `Memory: ${title}`,
      `Unlock date: ${input.unlockDate}`,
      "",
      `Open Memory: ${input.unlockUrl}`,
      "",
      "Thank you for trusting Until Tomorrow with your memories.",
    ].join("\n"),
  };
}

export function buildCapsuleUnlockEmailTemplate(input: {
  logoUrl: string;
  capsuleTitle: string;
  unlockDate: string;
  unlockUrl: string;
  memoryCount?: number | null;
}) {
  const title = input.capsuleTitle.trim() || "Your capsule";
  const memoryLine =
    typeof input.memoryCount === "number"
      ? [`${input.memoryCount} ${input.memoryCount === 1 ? "memory" : "memories"} included`, ""]
      : [];

  return {
    react: <UnlockCapsuleEmail {...input} capsuleTitle={title} />,
    text: [
      "Your capsule is ready",
      "",
      "The moment has arrived. Your capsule is now available to open and revisit.",
      "",
      `Capsule: ${title}`,
      `Unlock date: ${input.unlockDate}`,
      ...memoryLine,
      `Open Capsule: ${input.unlockUrl}`,
      "",
      "Thank you for preserving moments with Until Tomorrow.",
    ].join("\n"),
  };
}

export function buildGiftCapsuleRecipientEmailTemplate(input: {
  logoUrl: string;
  recipientName?: string | null;
  ownerDisplayName?: string | null;
  recipientNote?: string | null;
  unlockUrl: string;
}) {
  const recipientName = input.recipientName?.trim() || null;
  const ownerDisplayName = input.ownerDisplayName?.trim() || "Someone";
  const recipientNote = input.recipientNote?.trim() || null;

  return {
    react: (
      <GiftCapsuleRecipientEmail
        {...input}
        recipientName={recipientName}
        ownerDisplayName={ownerDisplayName}
        recipientNote={recipientNote}
      />
    ),
    text: [
      `Hi ${recipientName || "there"},`,
      "",
      `${ownerDisplayName} created a time capsule for you with memories from your friends.`,
      "",
      ...(recipientNote ? [recipientNote, ""] : []),
      `Open it here: ${input.unlockUrl}`,
      "",
      "With love,",
      "Until Tomorrow",
    ].join("\n"),
  };
}

export function buildGiftCapsuleOwnerConfirmationEmailTemplate(input: {
  logoUrl: string;
  recipientName?: string | null;
}) {
  const recipientName = input.recipientName?.trim() || null;
  const recipientLabel = recipientName || "your recipient";

  return {
    react: (
      <GiftCapsuleOwnerConfirmationEmail
        logoUrl={input.logoUrl}
        recipientName={recipientName}
      />
    ),
    text: `Your capsule for ${recipientLabel} was sent today.`,
  };
}
