import UnlockCapsuleEmail from "@/emails/UnlockCapsuleEmail";
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
