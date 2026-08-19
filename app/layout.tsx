import type { Metadata } from "next";
import localFont from "next/font/local";

import { cn } from "@/lib/utils";
import "./globals.css";

const sarabun = localFont({
  src: [
    { path: "../node_modules/@fontsource/sarabun/files/sarabun-thai-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/sarabun/files/sarabun-thai-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/sarabun/files/sarabun-thai-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sarabun",
  display: "swap",
});

const kanit = localFont({
  src: [
    { path: "../node_modules/@fontsource/kanit/files/kanit-thai-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/kanit/files/kanit-thai-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบผู้ป่วยจิตเวช",
  description: "Hospital psychiatric patient management system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      data-scroll-behavior="smooth"
      className={cn("h-full font-sans antialiased", sarabun.variable, kanit.variable)}
    >
      <body className="min-h-full bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
