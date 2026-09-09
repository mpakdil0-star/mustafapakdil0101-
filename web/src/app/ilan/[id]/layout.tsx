import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Talep ve Teklif Takibi',
  description: 'İşBitir hizmet talebinizin durumunu ve gelen usta tekliflerini takip edin.',
  robots: { index: false, follow: false, noarchive: true },
};

export default function TrackingLayout({ children }: { children: React.ReactNode }) { return children; }
