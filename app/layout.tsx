import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบผู้ป่วยจิตเวช",
  description: "Hospital psychiatric patient management system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
