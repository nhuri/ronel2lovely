import type { Metadata } from "next";
import "./globals.css";
import { SiteBanner } from "./site-banner";
import { VisitTracker } from "./visit-tracker";

export const metadata: Metadata = {
  title: "Ronel Lovely - Admin",
  description: "Matchmaking admin dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className="overflow-x-hidden w-full">
      <body className="bg-gray-50 text-gray-900 min-h-screen overflow-x-hidden overscroll-x-none w-full">
        <VisitTracker />
        <SiteBanner />
        {children}
      </body>
    </html>
  );
}
