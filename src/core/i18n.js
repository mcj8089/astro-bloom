import { GAME_CONFIG } from "../../config/game.config.js";
import { LOCALES, SUPPORTED_LANGS } from "../../config/locales.js";
import { formatNumber, getQuery } from "./utils.js";

function resolveLanguage() {
  // Default comes from the config file. A query override exists only for QA:
  // there is intentionally no in-game language switch.
  const query = getQuery();
  const requested = (query.get("lang") || "").toLowerCase();
  const fallback = GAME_CONFIG.meta.defaultLocale || "en";
  if (requested.startsWith("zh") && SUPPORTED_LANGS.includes("zh")) return "zh";
  if (SUPPORTED_LANGS.includes(requested)) return requested;
  return SUPPORTED_LANGS.includes(fallback) ? fallback : "en";
}

export const lang = resolveLanguage();
const dict = LOCALES[lang] || LOCALES.en;

export function t(key, vars) {
  const template = dict[key] ?? LOCALES.en[key] ?? key;
  if (!vars) return template;
  return String(template).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

export function has(key) {
  return Object.prototype.hasOwnProperty.call(dict, key);
}

export function n(value) {
  return formatNumber(value, lang);
}

export function localeCode() {
  return lang === "zh" ? "zh-CN" : "en";
}

export function isZh() {
  return lang === "zh";
}

export function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
}

export function applyDocumentMeta() {
  document.documentElement.lang = localeCode();
  document.title = t("meta.title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("meta.description"));
  const keywords = document.querySelector('meta[name="keywords"]');
  if (keywords) keywords.setAttribute("content", t("meta.keywords"));
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", t("meta.title"));
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", t("meta.description"));
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute("content", t("meta.title"));
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute("content", t("meta.description"));
}

export const i18n = { lang, t, n, has, isZh, applyStaticTranslations, applyDocumentMeta };
export default i18n;
