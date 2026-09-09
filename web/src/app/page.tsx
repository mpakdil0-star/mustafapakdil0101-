import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CategoriesSection from '@/components/CategoriesSection';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import FaqSection from '@/components/FaqSection';
import AppDownload from '@/components/AppDownload';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
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


