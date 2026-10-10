// The page speaks German, French or English. The language comes from the address (#fr, #en), then
// from the reader's last choice, then from the browser; German otherwise.
// Keep this file identical in every animation.

export const LANGUAGES = ["de", "fr", "en"];
export const DEFAULT_LANGUAGE = "de";

const supported = (lang) => LANGUAGES.includes(lang);

export function pickLanguage({ hash = "", stored = null, browser = [] } = {}) {
  const fromHash = hash.replace(/^#/, "");
  if (supported(fromHash)) return fromHash;
  if (supported(stored)) return stored;
  return browser.map((tag) => tag.slice(0, 2).toLowerCase()).find(supported) ?? DEFAULT_LANGUAGE;
}

// t(key, values): the text in the chosen language, German when a translation is missing,
// with {name} replaced by values.name
export function translator(strings, lang) {
  const chosen = strings[lang] ?? {};
  const german = strings[DEFAULT_LANGUAGE];
  return (key, values = {}) => (chosen[key] || german[key] || key).replace(/\{(\w+)\}/g, (all, name) => (name in values ? values[name] : all));
}

const placeholders = (text) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort().join(" ");

// what a dictionary still lacks: keys missing or empty in a language, or with other {values} than German
export function gaps(strings) {
  const german = strings[DEFAULT_LANGUAGE];
  const report = [];
  for (const lang of LANGUAGES.filter((l) => l !== DEFAULT_LANGUAGE)) report.push(...gapsIn(german, strings[lang] ?? {}, lang));
  return report;
}

function gapsIn(german, other, lang) {
  return Object.keys(german).flatMap((key) => {
    if (!other[key]) return [`${lang}: ${key}`];
    const [want, have] = [placeholders(german[key]), placeholders(other[key])];
    return want === have ? [] : [`${lang}: ${key} (${have || "none"} instead of ${want || "none"})`];
  });
}

// fills the marked elements of the page: data-i18n (text), data-i18n-html (markup from the dictionary),
// data-i18n-aria (accessible name), and presses the button of the chosen language (data-lang)
export function translatePage(doc, t, lang) {
  doc.documentElement.lang = lang;
  doc.title = t("page.title");
  doc.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  doc.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  doc.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  doc.querySelectorAll("[data-lang]").forEach((el) => { el.setAttribute("aria-pressed", String(el.dataset.lang === lang)); });
}

// the reader's choice, shared by all animations served from the same site; a storage that refuses
// access (private window, blocked site data) just means no remembered choice
const STORAGE_KEY = "teaching-animations.lang";

export function readStoredLanguage(storage) {
  try {
    return storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function storeLanguage(storage, lang) {
  try {
    storage?.setItem(STORAGE_KEY, lang);
  } catch {
    // the choice then lasts for this visit only
  }
}

// numbers with a fixed count of decimals: a decimal comma in French, a point in German (Swiss usage)
// and in English
export const decimals = (lang) => (value, digits) => (lang === "fr" ? value.toFixed(digits).replace(".", ",") : value.toFixed(digits));
