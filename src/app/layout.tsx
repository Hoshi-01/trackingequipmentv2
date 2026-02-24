import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Equipment Tracking - PT Tera Emcal Solusindo",
  description: "Sistem Tracking Alat Kalibrator - Modern Dashboard",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260208", sizes: "any" },
      { url: "/icon-star.png?v=20260208", type: "image/png", sizes: "64x64" },
      { url: "/icon-star.svg?v=20260208", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico?v=20260208"],
    apple: [{ url: "/icon-star.png?v=20260208", sizes: "64x64" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
