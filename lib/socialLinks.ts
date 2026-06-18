const DEFAULT_TIKTOK_URL = "https://www.tiktok.com/@until_tomorrowapp";
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/until_tomorrowapp";

function getExternalUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function getSocialLinks() {
  return {
    tiktok: getExternalUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, DEFAULT_TIKTOK_URL),
    instagram: getExternalUrl(
      process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      DEFAULT_INSTAGRAM_URL
    ),
  };
}
