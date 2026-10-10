import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pickLanguage, translator, gaps, LANGUAGES, DEFAULT_LANGUAGE } from "../src/i18n.js";

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
