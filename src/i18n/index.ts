import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";

// Only English ships today. To add a language, create locales/<code>.ts with the
// same keys and add it here; the browser's language is picked automatically.
const resources = { en: { translation: en } } as const;

const saved = (() => {
	try {
		return localStorage.getItem("lang");
	} catch {
		return null;
	}
})();
const browser = navigator.language.split("-")[0];
const lng = [saved, browser].find((code): code is string => !!code && code in resources) ?? "en";

i18n.use(initReactI18next).init({
	resources,
	lng,
	fallbackLng: "en",
	interpolation: { escapeValue: false }, // React already escapes
	returnNull: false,
});

document.documentElement.lang = lng;

export default i18n;
