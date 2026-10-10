import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pickLanguage, translator, gaps, translatePage, readStoredLanguage, storeLanguage, LANGUAGES, DEFAULT_LANGUAGE } from "../src/i18n.js";

const anyOf = (list) => list[Math.floor(Math.random() * list.length)];
const anyOtherThan = (lang) => anyOf(LANGUAGES.filter((l) => l !== lang));

describe("LanguageChoiceSpecification", () => {
  test("ShouldOfferGermanFrenchAndEnglish", () => {
    // GIVEN / WHEN / THEN
    assert.deepEqual(LANGUAGES, ["de", "fr", "en"]);
  });

  test("ShouldDefaultToGerman", () => {
    // GIVEN / WHEN / THEN
    assert.equal(DEFAULT_LANGUAGE, "de");
  });

  test("ShouldTakeTheLanguageFromTheAddress", () => {
    // GIVEN
    const lang = anyOf(LANGUAGES);
    // WHEN
    const picked = pickLanguage({ hash: `#${lang}`, stored: anyOtherThan(lang), browser: [anyOtherThan(lang)] });
    // THEN
    assert.equal(picked, lang);
  });

  test("ShouldPreferTheReadersLastChoiceOverTheBrowser", () => {
    // GIVEN
    const lang = anyOf(LANGUAGES);
    // WHEN
    const picked = pickLanguage({ hash: "#about", stored: lang, browser: [anyOtherThan(lang)] });
    // THEN
    assert.equal(picked, lang);
  });

  test("ShouldFallBackToTheFirstSupportedBrowserLanguage", () => {
    // GIVEN
    const lang = anyOf(LANGUAGES);
    // WHEN
    const picked = pickLanguage({ hash: "", stored: null, browser: ["ja-JP", `${lang}-CH`, anyOtherThan(lang)] });
    // THEN
    assert.equal(picked, lang);
  });

  test("ShouldFallBackToGermanWhenNothingElseFits", () => {
    // GIVEN / WHEN
    const picked = pickLanguage({ hash: "#film", stored: "xx", browser: ["ja-JP"] });
    // THEN
    assert.equal(picked, DEFAULT_LANGUAGE);
  });
});

const anyWord = () => Math.random().toString(36).slice(2, 8);

describe("TranslatorSpecification", () => {
  test("ShouldGiveTheTextInTheChosenLanguage", () => {
    // GIVEN
    const [de, fr] = [anyWord(), anyWord()];
    const t = translator({ de: { k: de }, fr: { k: fr }, en: { k: anyWord() } }, "fr");
    // WHEN
    const text = t("k");
    // THEN
    assert.equal(text, fr);
  });

  test("ShouldFillInTheNamedValues", () => {
    // GIVEN
    const value = anyWord();
    const t = translator({ de: { k: "a {x} b" }, fr: {}, en: {} }, "de");
    // WHEN
    const text = t("k", { x: value });
    // THEN
    assert.equal(text, `a ${value} b`);
  });

  test("ShouldFallBackToGermanWhenATranslationIsMissing", () => {
    // GIVEN
    const de = anyWord();
    const t = translator({ de: { k: de }, fr: {}, en: {} }, "en");
    // WHEN
    const text = t("k");
    // THEN
    assert.equal(text, de);
  });

  test("ShouldReportKeysMissingOrEmptyInALanguage", () => {
    // GIVEN
    const strings = { de: { a: "x", b: "y", c: "z" }, fr: { a: "x", b: "" }, en: { a: "x", b: "y", c: "z" } };
    // WHEN
    const missing = gaps(strings);
    // THEN
    assert.deepEqual(missing, ["fr: b", "fr: c"]);
  });

  test("ShouldReportTranslationsWhoseValuesDifferFromGerman", () => {
    // GIVEN
    const strings = { de: { a: "{n} Zellen" }, fr: { a: "{count} cellules" }, en: { a: "{n} cells" } };
    // WHEN
    const missing = gaps(strings);
    // THEN
    assert.deepEqual(missing, ["fr: a ({count} instead of {n})"]);
  });
});

// a stand-in for the document: elements carrying data-i18n, data-i18n-html, data-i18n-aria or data-lang
function fakeElement(dataset) {
  return { dataset, textContent: "", innerHTML: "", attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
}
function fakeDocument(elements) {
  const matches = (selector, el) => ({ "[data-i18n]": "i18n", "[data-i18n-html]": "i18nHtml", "[data-i18n-aria]": "i18nAria", "[data-lang]": "lang" })[selector] in el.dataset;
  return { documentElement: {}, title: "", querySelectorAll: (selector) => elements.filter((el) => matches(selector, el)) };
}

describe("PageTranslationSpecification", () => {
  test("ShouldWriteTheTranslatedTextIntoEveryMarkedElement", () => {
    // GIVEN
    const text = anyWord();
    const el = fakeElement({ i18n: "k" });
    // WHEN
    translatePage(fakeDocument([el]), (key) => (key === "k" ? text : ""), "fr");
    // THEN
    assert.equal(el.textContent, text);
  });

  test("ShouldMarkOnlyTheChosenLanguageAsPressed", () => {
    // GIVEN
    const buttons = LANGUAGES.map((lang) => fakeElement({ lang }));
    const lang = anyOf(LANGUAGES);
    // WHEN
    translatePage(fakeDocument(buttons), () => "", lang);
    // THEN
    assert.deepEqual(buttons.map((b) => b.attributes["aria-pressed"]), LANGUAGES.map((l) => String(l === lang)));
  });

  test("ShouldDeclareTheLanguageOfTheDocument", () => {
    // GIVEN
    const doc = fakeDocument([]);
    const lang = anyOf(LANGUAGES);
    // WHEN
    translatePage(doc, () => "", lang);
    // THEN
    assert.equal(doc.documentElement.lang, lang);
  });
});

describe("StoredLanguageSpecification", () => {
  const memoryStorage = () => { const data = {}; return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } }; };
  const refusingStorage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };

  test("ShouldRememberTheChosenLanguage", () => {
    // GIVEN
    const storage = memoryStorage();
    const lang = anyOf(LANGUAGES);
    // WHEN
    storeLanguage(storage, lang);
    // THEN
    assert.equal(readStoredLanguage(storage), lang);
  });

  test("ShouldReadNothingFromAStorageThatRefusesAccess", () => {
    // GIVEN / WHEN
    const stored = readStoredLanguage(refusingStorage);
    // THEN
    assert.equal(stored, null);
  });

  test("ShouldNotFailWhenTheStorageRefusesToStore", () => {
    // GIVEN / WHEN / THEN
    assert.doesNotThrow(() => storeLanguage(refusingStorage, anyOf(LANGUAGES)));
  });
});

