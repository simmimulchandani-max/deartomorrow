import type { Metadata, Viewport } from "next";
import { Dancing_Script, Inter, Merriweather } from "next/font/google";
import "./globals.css";

const displayFont = Merriweather({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const handwrittenFont = Dancing_Script({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Dear Tomorrow",
  description: "Leave something for your future self.",
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${handwrittenFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
