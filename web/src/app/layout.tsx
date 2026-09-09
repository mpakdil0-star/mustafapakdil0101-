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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://isbitirapp.com"),
  title: { default: "İşBitir | Bölgenizdeki Ustalardan Teklif Alın", template: "%s | İşBitir" },
  description: "Elektrik, çilingir, tesisat ve ev hizmetleri için talebinizi yayınlayın; bölgenizdeki uygun ustaların tekliflerini karşılaştırın.",
  keywords: ["elektrikçi", "acil elektrikçi", "çilingir", "tesisatçı", "klima ustası", "usta çağır", "isbitir"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "İşBitir",
    title: "İşBitir | Bölgenizdeki Ustalardan Teklif Alın",
    description: "Hizmet talebinizi yayınlayın, uygun ustaların tekliflerini karşılaştırın.",
    url: "/",
  },
  robots: process.env.NEXT_PUBLIC_LEGAL_READY === "true" ? undefined : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`h-full ${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
