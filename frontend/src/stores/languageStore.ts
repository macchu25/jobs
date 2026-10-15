import { create } from 'zustand';
import { translations, Language, TranslationSchema } from '../i18n/translations';

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: TranslationSchema;
}

const getSavedLang = (): Language => {
  const saved = localStorage.getItem('app_lang');
  if (saved === 'vi' || saved === 'en') return saved;
  return 'vi';
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  lang: getSavedLang(),
  t: translations[getSavedLang()],
  setLang: (lang: Language) => {
    localStorage.setItem('app_lang', lang);
    set({ lang, t: translations[lang] });
  },
  toggleLang: () => {
    const nextLang = get().lang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('app_lang', nextLang);
    set({ lang: nextLang, t: translations[nextLang] });
  },
}));
