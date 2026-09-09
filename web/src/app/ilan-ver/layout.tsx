import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hizmet Talebi Oluştur',
  description: 'Hizmet alanını ve bölgenizi belirtin; uygun ustaların tekliflerini aynı ekrandan takip edin.',
  alternates: { canonical: '/ilan-ver' },
};

export default function CreateJobLayout({ children }: { children: React.ReactNode }) { return children; }
