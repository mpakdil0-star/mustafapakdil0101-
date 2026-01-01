import { colors as staticColors } from './colors';

export interface JobCategory {
    name: string;
    icon: string;
    colors: [string, string, ...string[]];
}

export const JOB_CATEGORIES: JobCategory[] = [
    { name: 'Elektrik Tesisatı', icon: 'flash', colors: ['#A78BFA', '#7C3AED'] },
    { name: 'Elektrik Tamiri', icon: 'hammer', colors: ['#F87171', '#DC2626'] },
    { name: 'Aydınlatma', icon: 'bulb', colors: ['#FBBF24', '#D97706'] },
    { name: 'Priz ve Anahtar', icon: 'radio', colors: ['#60A5FA', '#2563EB'] },
    { name: 'Elektrik Panosu', icon: 'layers', colors: ['#4ADE80', '#16A34A'] },
    { name: 'Kablo Çekimi', icon: 'repeat', colors: ['#FB7185', '#E11D48'] },
    { name: 'Uydu Sistemleri', icon: 'planet', colors: ['#2DD4BF', '#0891B2'] },
    { name: 'Elektrik Kontrolü', icon: 'shield-checkmark', colors: ['#818CF8', '#4F46E5'] },
    { name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'] },
];
