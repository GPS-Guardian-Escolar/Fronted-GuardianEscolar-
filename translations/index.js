import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import pt from './pt.json';

export const translations = { es, en, fr, pt };

export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}', available: true },
  { code: 'en', label: 'English', flag: '\u{1F1FA}\u{1F1F8}', available: true },
  { code: 'fr', label: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', available: true },
  { code: 'pt', label: 'Portugu\u00eas', flag: '\u{1F1E7}\u{1F1F7}', available: true },
];
