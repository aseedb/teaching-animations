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
