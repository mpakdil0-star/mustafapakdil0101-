import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "İşBitir | Bölgenizdeki En Yakın Elektrik & Acil Usta Hizmeti",
  description: "Evinizde veya iş yerinizde acil elektrikçi, çilingir, tesisatçı mı lazım? İşBitir ile konumunuza en yakın onaylı ustalar bir tıkla kapınızda.",
  keywords: ["elektrikçi", "acil elektrikçi", "çilingir", "tesisatçı", "klima ustası", "usta çağır", "isbitir"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
