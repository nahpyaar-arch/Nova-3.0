import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";


i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      pt: { translation: pt },
      ru: { translation: ru },
      ja: { translation: ja },  // ✅ use ISO code "ja"
  ko: { translation: ko },  // ✅ use ISO code "ko"
  zh: { translation: zh }   // ✅ use ISO code "zh"
    },
    lng: "en",          // default language
    fallbackLng: "en",  // fallback if missing
    interpolation: { escapeValue: false }
  });

export default i18n;
