// i18n — Flutter I18n/tr() 이식. 영어가 기본 폴백, 한국어는 번역 (CLAUDE.md 문자열 규칙).
// 로케일 변경은 AppSettings 컨텍스트가 앱 루트를 key 리마운트해 반영한다(Flutter와 동일 전략).
import { stringsEn } from './strings_en';
import { stringsKo } from './strings_ko';

export type Locale = 'en' | 'ko';

const bundles: Record<Locale, Record<string, string>> = {
  en: stringsEn,
  ko: stringsKo,
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** 키 조회: 현재 로케일 → en → 키 자체. args는 '{n}' 자리표시자 치환. */
export function tr(key: string, args?: Record<string, string | number>): string {
  let value = bundles[currentLocale][key] ?? bundles.en[key] ?? key;
  if (args) {
    for (const [k, v] of Object.entries(args)) {
      value = value.split(`{${k}}`).join(String(v));
    }
  }
  return value;
}
