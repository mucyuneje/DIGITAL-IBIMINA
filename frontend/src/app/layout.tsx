import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { APP_DEFAULT_TITLE } from "@/config";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "700", "800"] });

export const metadata: Metadata = {
  title: APP_DEFAULT_TITLE,
  description: "Ibimina community savings group (Ikimina) — deposits, transparent ledgers, multi-sig withdrawals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="rw" className={cn("h-full", "antialiased", "font-sans", manrope.variable)}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
