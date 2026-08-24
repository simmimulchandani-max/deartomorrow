import { getStorageBucketName } from "@/lib/storageBucket";
export { dateOnly, hasDateArrived } from "@/lib/unlockDates";

export const MEMORY_TITLE_MAX = 140;
export const MEMORY_MESSAGE_MAX = 4000;
export const MEMORY_PASSWORD_MAX = 128;
export const CAPSULE_TITLE_MAX = 140;
export const CAPSULE_DESCRIPTION_MAX = 1200;
export const CONTRIBUTOR_NAME_MAX = 80;
export const MAX_MEDIA_FILES = 8;
export const MAX_MEDIA_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_MEDIA_BYTES = 100 * 1024 * 1024;
export const MAX_MEMORY_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_MEMORY_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_MEMORY_TOTAL_MEDIA_BYTES = 200 * 1024 * 1024;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/;
const ALLOWED_MEDIA_MIME_PREFIXES = ["image/", "video/"];

export type NamedFileLike = {
  name: string;
  type: string;
  size: number;
};

export function isValidDateString(value: string) {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isSafeIdentifier(value: string) {
  return SAFE_IDENTIFIER_PATTERN.test(value);
}

export function validateTextLength(value: string, label: string, maxLength: number) {
  if (value.length > maxLength) {
    return `${label} must be ${maxLength} characters or less.`;
  }

  return null;
}

export function validateMediaFiles(files: NamedFileLike[]) {
  return validateMediaFilesWithLimits(files, {
    imageBytes: MAX_MEDIA_FILE_BYTES,
    videoBytes: MAX_MEDIA_FILE_BYTES,
    totalBytes: MAX_TOTAL_MEDIA_BYTES,
  });
}

export function validateMemoryMediaFiles(files: NamedFileLike[]) {
  const validationError = validateMediaFilesWithLimits(files, {
    imageBytes: MAX_MEMORY_IMAGE_BYTES,
    videoBytes: MAX_MEMORY_VIDEO_BYTES,
    totalBytes: MAX_MEMORY_TOTAL_MEDIA_BYTES,
  });

  return validationError === "The total media limit is 200 MB."
    ? "The total media limit for one memory is 200 MB."
    : validationError;
}

function validateMediaFilesWithLimits(
  files: NamedFileLike[],
  limits: { imageBytes: number; videoBytes: number; totalBytes: number }
) {
  if (files.length > MAX_MEDIA_FILES) {
    return `You can upload up to ${MAX_MEDIA_FILES} files.`;
  }

  let totalBytes = 0;
  for (const file of files) {
    const normalizedType = file.type.trim().toLowerCase();
    if (
      !ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) =>
        normalizedType.startsWith(prefix)
      )
    ) {
      return "Only image and video files are allowed.";
    }

    if (file.size <= 0) {
      return "Empty files cannot be uploaded.";
    }

    if (normalizedType.startsWith("image/") && file.size > limits.imageBytes) {
      const megabytes = limits.imageBytes / (1024 * 1024);
      return `This image is too large. Please choose an image that is ${megabytes} MB or smaller.`;
    }

    if (normalizedType.startsWith("video/") && file.size > limits.videoBytes) {
      const megabytes = limits.videoBytes / (1024 * 1024);
      return `This video is too large. Please choose a video that is ${megabytes} MB or smaller.`;
    }

    totalBytes += file.size;
  }

  if (totalBytes > limits.totalBytes) {
    const megabytes = limits.totalBytes / (1024 * 1024);
    return `The total media limit is ${megabytes} MB.`;
  }

  return null;
}

function normalizePublicStoragePrefix(prefixPath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const bucket = getStorageBucketName();

  if (!supabaseUrl || !bucket) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${prefixPath.replace(/^\/+/, "")}`;
}

export function filterTrustedPublicUrls(urls: string[], prefixPath: string) {
  const trustedPrefix = normalizePublicStoragePrefix(prefixPath);

  if (!trustedPrefix) {
    return [];
  }

  return urls.filter((value) => {
    if (typeof value !== "string" || !value) {
      return false;
    }

    try {
      const parsed = new URL(value);
      return parsed.href.startsWith(trustedPrefix);
    } catch {
      return false;
    }
  });
}
