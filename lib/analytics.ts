"use client";

type EventParameters = Record<string, boolean | number | string>;

export function trackEvent(eventName: string, parameters?: EventParameters) {
  try {
    if (typeof window === "undefined") return;

    const analyticsWindow = window as typeof window & {
      gtag?: (command: "event", name: string, params?: EventParameters) => void;
      dataLayer?: unknown[][];
    };
    const gtag = analyticsWindow.gtag;

    if (typeof gtag === "function") {
      gtag("event", eventName, parameters);
      return;
    }

    analyticsWindow.dataLayer?.push(["event", eventName, parameters]);
  } catch {
    // Analytics must never affect product behavior.
  }
}
