/**
 * i18n servisi geçici olarak devre dışı bırakıldı.
 * 'tr.json' ve 'en.json' dosyalarının eksik olması Metro bundler'ı çökerttiği için
 * tüm uygulama metinleri hardcoded Türkçe'ye döndürüldü.
 */

/*
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
// import tr from '../data/locales/tr.json';
// import en from '../data/locales/en.json';

const resources = {
    tr: { translation: {} },
    en: { translation: {} },
};

export default i18n;
*/

// Empty export to satisfy imports if any remain
export default {
    t: (key: string) => key,
    changeLanguage: async () => { },
};
export const changeLanguage = async () => { };
