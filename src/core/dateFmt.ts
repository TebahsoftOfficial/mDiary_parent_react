// 날짜 표시 — i18n 번들이 포맷 문자열 자체를 키로 갖는다(Flutter DateFormat 이식).
// Dart 토큰(M·d·E·y 등)은 date-fns와 사실상 호환. 서버 UTC ISO → Date는 자동 로컬 변환.
import { format } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { getLocale, tr } from './i18n/i18n';

/** i18n 키가 담은 패턴으로 포맷 (예: fmtByKey(date, 'home.dateFmt')). */
export function fmtByKey(date: Date, patternKey: string): string {
  return fmt(date, tr(patternKey));
}

export function fmt(date: Date, pattern: string): string {
  return format(date, pattern, { locale: getLocale() === 'ko' ? ko : enUS });
}
