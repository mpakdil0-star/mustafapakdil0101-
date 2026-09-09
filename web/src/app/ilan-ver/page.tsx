'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, MapPin, Navigation, Send, ShieldCheck, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LocationSelector from '@/components/LocationSelector';
import { MAIN_CATEGORIES } from '@/constants/categories';
import { CITY_NAMES, TURKISH_CITIES } from '@/constants/locations';
import { webJobService, type WebJob } from '@/services/webJobService';

type Urgency = 'HIGH' | 'MEDIUM' | 'LOW';

const urgencyOptions: Array<{
  value: Urgency;
  title: string;
  description: string;
  icon: typeof Zap;
  activeClass: string;
}> = [
  { value: 'HIGH', title: 'Öncelikli', description: 'Mümkün olan en kısa sürede', icon: Zap, activeClass: 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20' },
  { value: 'MEDIUM', title: 'Esnek', description: 'Gün içinde değerlendirilebilir', icon: Clock, activeClass: 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20' },
  { value: 'LOW', title: 'Planlı', description: 'Uygun bir tarih için', icon: CheckCircle2, activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' },
];

function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function matchCity(inputCity: string): string {
  const exact = CITY_NAMES.find((c) => c.toLowerCase() === inputCity.toLowerCase());
  if (exact) return exact;
  const normalized = normalizeLocationName(inputCity);
  return CITY_NAMES.find((c) => normalizeLocationName(c) === normalized) || '';
}

function matchDistrict(cityName: string, inputDistrict: string): string {
  const city = TURKISH_CITIES.find((c) => c.name === cityName);
  if (!city) return '';
  const exact = city.districts.find((d) => d.name.toLowerCase() === inputDistrict.toLowerCase());
  if (exact) return exact.name;
  const normalized = normalizeLocationName(inputDistrict);
  const found = city.districts.find((d) => normalizeLocationName(d.name) === normalized);
  return found ? found.name : '';
}

function CreateJobForm() {
  const searchParams = useSearchParams();
  const queryCategory = searchParams.get('kategori');
  const initialCategory = queryCategory && MAIN_CATEGORIES.some((item) => item.id === queryCategory) ? queryCategory : 'elektrik';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showAllCategories, setShowAllCategories] = useState(!MAIN_CATEGORIES.find((item) => item.id === initialCategory)?.popular);
  const [urgency, setUrgency] = useState<Urgency>('HIGH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdJob, setCreatedJob] = useState<WebJob | null>(null);

  const handleGetLocation = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage('Tarayıcınız konum özelliğini desteklemiyor. Lütfen il ve ilçenizi listeden seçin.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });

        try {
          // OpenStreetMap Nominatim reverse geocode for browser
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'tr' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const rawProvince = addr.province || addr.city || addr.state || '';
            const rawDistrict = addr.county || addr.town || addr.borough || addr.district || '';

            const matchedCity = matchCity(rawProvince);
            if (matchedCity) {
              setCity(matchedCity);
              const matchedDist = matchDistrict(matchedCity, rawDistrict);
              if (matchedDist) {
                setDistrict(matchedDist);
                setLocationMessage(`Konumunuz tespit edildi: ${matchedCity}, ${matchedDist}. Lütfen mahallenizi seçin.`);
              } else {
                setLocationMessage(`İliniz tespit edildi: ${matchedCity}. Lütfen ilçe ve mahallenizi seçin.`);
              }
            } else {
              setLocationMessage('Konum koordinatları alındı. Lütfen il, ilçe ve mahallenizi listeden seçin.');
            }
          } else {
            setLocationMessage('Konum koordinatları alındı. Lütfen il ve ilçenizi listeden seçin.');
          }
        } catch {
          setLocationMessage('Konum koordinatları alındı. Lütfen il ve ilçenizi listeden seçin.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocationMessage('Konum izni verilmedi. İl, ilçe ve mahallenizi aşağıdaki listeden kolayca seçebilirsiniz.');
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60_000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (website) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      const job = await webJobService.create({
        title: title.trim(),
        description: description.trim() || 'Web üzerinden oluşturulan hizmet talebi.',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        category: MAIN_CATEGORIES.find((category) => category.id === selectedCategory)?.name || 'Usta hizmeti',
        serviceCategory: selectedCategory,
        urgencyLevel: urgency,
        location: {
          city: city.trim(),
          district: district.trim(),
          neighborhood: neighborhood.trim(),
          address: [addressDetails.trim(), neighborhood.trim(), district.trim(), city.trim()].filter(Boolean).join(', '),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
      });
      setCreatedJob(job);
      try {
        localStorage.setItem(
          'isbitir_active_job',
          JSON.stringify({
            id: job.id,
            title: job.title,
            category: job.category,
            createdAt: job.createdAt,
          })
        );
      } catch {
        // ignore
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Talep oluşturulamadı. Lütfen yeniden deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryName = MAIN_CATEGORIES.find((category) => category.id === selectedCategory)?.name;
  const visibleCategories = showAllCategories ? MAIN_CATEGORIES : MAIN_CATEGORIES.filter((category) => category.popular);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {createdJob ? (
            <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl sm:p-12" aria-live="polite">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-10 w-10" aria-hidden="true" /></div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-teal-700">Talebiniz kaydedildi</span>
                <h1 className="mt-2 text-3xl font-black text-slate-950">Teklifleri bu sayfadan takip edin</h1>
                <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-600">Hizmet kategorisi ve bölge tercihleri eşleşen uygun ustalar için bildirim oluşturuldu. Bildirimin teslimi cihaz ve bağlantı koşullarına göre değişebilir; teklif geleceği garanti edilmez.</p>
              </div>
              <dl className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-5 text-left text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Hizmet</dt><dd className="font-bold text-slate-800">{categoryName}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Bölge</dt><dd className="text-right font-bold text-slate-800">{district} / {neighborhood}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Durum</dt><dd className="font-bold text-amber-700">Teklif bekleniyor</dd></div>
              </dl>
              <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                <Link href={`/ilan/${createdJob.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700"><Zap className="h-4 w-4" aria-hidden="true" /> Teklifleri takip et</Link>
                <Link href="/" className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Ana sayfaya dön</Link>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">Takip bağlantısı bu tarayıcıdaki güvenli oturumla çalışır. Tarayıcı verilerini silmeniz hâlinde erişim kaybolabilir.</p>
            </section>
          ) : (
            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl">
              <header className="bg-slate-950 px-6 py-6 text-white">
                <div className="flex items-center justify-between gap-5">
                  <div><h1 className="text-xl font-bold">Hizmet talebi oluştur</h1><p className="mt-1 text-xs text-slate-400">Bilgilerinizi kontrol ederek üç adımda yayınlayın.</p></div>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Adım {step} / 3</span>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Form ilerlemesi" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${(step / 3) * 100}%` }} /></div>
              </header>

              <div className="p-6 sm:p-10">
                {step === 1 && (
                  <div className="space-y-8">
                    <fieldset>
                      <legend className="mb-3 text-sm font-bold text-slate-950">1. Hangi hizmete ihtiyacınız var?</legend>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {visibleCategories.map((category) => (
                          <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => setSelectedCategory(category.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selectedCategory === category.id ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-600/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white"><Zap className="h-5 w-5 text-teal-600" aria-hidden="true" /></span>
                            <span><span className="block text-sm font-bold text-slate-950">{category.name}</span><span className="line-clamp-1 block text-xs text-slate-500">{category.description}</span></span>
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setShowAllCategories((value) => !value)} className="mt-3 w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800">{showAllCategories ? 'Sık kullanılan kategorileri göster' : `Tüm hizmetleri göster (${MAIN_CATEGORIES.length})`}</button>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-3 text-sm font-bold text-slate-950">2. Zamanlama tercihiniz nedir?</legend>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {urgencyOptions.map((option) => {
                          const Icon = option.icon;
                          return <button key={option.value} type="button" aria-pressed={urgency === option.value} onClick={() => setUrgency(option.value)} className={`rounded-2xl border p-4 text-center transition ${urgency === option.value ? option.activeClass : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Icon className="mx-auto mb-2 h-5 w-5" aria-hidden="true" /><span className="block text-sm font-bold">{option.title}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{option.description}</span></button>;
                        })}
                      </div>
                    </fieldset>
                    <button type="button" onClick={() => setStep(2)} className="w-full rounded-2xl bg-teal-600 py-4 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700">Adres ve talep detayına geç</button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <LocationSelector
                      city={city}
                      district={district}
                      neighborhood={neighborhood}
                      addressDetails={addressDetails}
                      onCityChange={setCity}
                      onDistrictChange={setDistrict}
                      onNeighborhoodChange={setNeighborhood}
                      onAddressDetailsChange={setAddressDetails}
                      onGetLocation={handleGetLocation}
                      isLocating={isLocating}
                      hasCoords={Boolean(coords)}
                      locationMessage={locationMessage}
                    />
                    <div><label htmlFor="job-title" className="mb-1.5 block text-sm font-bold text-slate-950">Kısa başlık</label><input id="job-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Sigorta sık sık atıyor" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20" /></div>
                    <div><label htmlFor="description" className="mb-1.5 block text-sm font-bold text-slate-950">Talep detayı <span className="font-normal text-slate-500">(isteğe bağlı)</span></label><textarea id="description" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ustanın teklif vermeden önce bilmesi gereken ayrıntıları yazın." className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20" /></div>
                    <div className="flex gap-3 pt-2"><button type="button" onClick={() => setStep(1)} className="w-1/3 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Geri</button><button type="button" disabled={!title.trim() || !city.trim() || !district.trim() || !neighborhood.trim()} onClick={() => setStep(3)} className="w-2/3 rounded-2xl bg-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">İletişim bilgilerine geç</button></div>
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div className="hidden" aria-hidden="true"><label htmlFor="website">Web sitesi</label><input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
                    <div><label htmlFor="customer-name" className="mb-1.5 block text-sm font-bold text-slate-950">Adınız soyadınız</label><input id="customer-name" type="text" required minLength={2} maxLength={120} autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Örn. Ahmet Yılmaz" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20" /></div>
                    <div><label htmlFor="customer-phone" className="mb-1.5 block text-sm font-bold text-slate-950">Telefon numaranız</label><input id="customer-phone" type="tel" required inputMode="tel" autoComplete="tel-national" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="05XX XXX XX XX" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20" /><p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden="true" />Numaranız teklif aşamasında ustalara gösterilmez; yalnızca kabul ettiğiniz usta iletişim bilgisine erişebilir.</p></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">Ad, telefon, talep ve konum bilgileriniz; talebin oluşturulması, uygun ustalara iletilmesi, güvenlik ve işlem takibi amaçlarıyla işlenir. Ayrıntıları <Link href="/kvkk" target="_blank" className="font-bold text-teal-700 underline underline-offset-2">KVKK Aydınlatma Metni</Link> içinde inceleyebilirsiniz.</div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700"><input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" /><span><Link href="/kullanim-kosullari" target="_blank" className="font-bold text-teal-700 underline underline-offset-2">Kullanım Koşulları</Link>&apos;nı okudum ve kabul ediyorum.</span></label>
                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /><span>Ustaların müsaitliği, bildirimin teslimi, teklif verilmesi ve hizmet süresi garanti edilmez. Mesafe bilgileri yaklaşık olabilir; hizmet kapsamı ve ücret usta ile vatandaş arasında netleştirilir.</span></div>
                    {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{formError}</div>}
                    <div className="flex gap-3 pt-2"><button type="button" onClick={() => setStep(2)} className="w-1/3 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Geri</button><button type="submit" disabled={isSubmitting || !customerName.trim() || !customerPhone.trim() || !acceptedTerms} className="flex w-2/3 items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 text-sm font-bold text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" /><span>{isSubmitting ? 'Talep oluşturuluyor…' : 'Talebi yayınla'}</span></button></div>
                  </form>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CreateJobPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50" />}><CreateJobForm /></Suspense>;
}
