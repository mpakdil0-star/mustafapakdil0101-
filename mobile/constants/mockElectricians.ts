// Mock data for electricians - gerçek uygulamada API'den gelecek
export interface MockElectrician {
  id: string;
  fullName: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  location: string;
  experience: string;
  phone: string;
  about: string;
  profileImageUrl: string | null;
}

export const mockElectriciansList: MockElectrician[] = [
  {
    id: 'elec-1',
    fullName: 'Mehmet Elektrikçi',
    rating: 4.8,
    reviewCount: 24,
    specialties: ['Elektrik Tesisatı', 'Pano Arızası'],
    location: 'Kadıköy, İstanbul',
    experience: '10+ yıl deneyim',
    phone: '+90 532 123 45 67',
    about: '10 yıldan fazla deneyime sahip profesyonel elektrikçi. Ev ve işyeri elektrik tesisatı konusunda uzman.',
    profileImageUrl: null,
  },
  {
    id: 'elec-2',
    fullName: 'Ahmet Yılmaz',
    rating: 4.9,
    reviewCount: 35,
    specialties: ['Led Aydınlatma', 'Elektrik Tamiri'],
    location: 'Beşiktaş, İstanbul',
    experience: '8 yıl deneyim',
    phone: '+90 533 234 56 78',
    about: 'Modern led aydınlatma çözümleri ve elektrik arızaları konusunda deneyimli. Hızlı ve kaliteli hizmet garantisi.',
    profileImageUrl: null,
  },
  {
    id: 'elec-3',
    fullName: 'Ali Demir',
    rating: 4.7,
    reviewCount: 18,
    specialties: ['Priz ve Anahtar', 'Kablo Çekimi'],
    location: 'Şişli, İstanbul',
    experience: '5 yıl deneyim',
    phone: '+90 534 345 67 89',
    about: 'Priz, anahtar montajı ve kablo çekimi işlerinde hızlı ve güvenilir hizmet. Uygun fiyat garantisi.',
    profileImageUrl: null,
  },
];

// Convert list to map for easy lookup by id
export const mockElectriciansMap: { [key: string]: MockElectrician } = mockElectriciansList.reduce(
  (acc, electrician) => {
    acc[electrician.id] = electrician;
    return acc;
  },
  {} as { [key: string]: MockElectrician }
);

