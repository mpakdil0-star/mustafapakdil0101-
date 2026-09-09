import Navbar from '@/components/Navbar';
import ActiveJobBanner from '@/components/ActiveJobBanner';
import Hero from '@/components/Hero';
import CategoriesSection from '@/components/CategoriesSection';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import FaqSection from '@/components/FaqSection';
import AppDownload from '@/components/AppDownload';
import Footer from '@/components/Footer';

export default function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://isbitirapp.com';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'İşBitir',
    url: baseUrl,
    inLanguage: 'tr-TR',
    description: 'Vatandaşların hizmet taleplerini bölgesindeki uygun ustalara ileten elektronik platform.',
  };
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <ActiveJobBanner />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <CategoriesSection />
        <HowItWorks />
        <Testimonials />
        <FaqSection />
        <AppDownload />
      </main>
      <Footer />
    </div>
  );
}

