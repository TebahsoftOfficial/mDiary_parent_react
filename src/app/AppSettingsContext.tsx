// 앱 설정(언어·폰트) — Flutter AppSettingsProvider 이식.
// 로케일 변경 시 앱 루트를 key 리마운트해 tr() 정적 조회를 반영한다(Flutter와 동일 전략).
// 폰트는 번들하지 않는다: 학생앱과 같은 서버 엔드포인트(download_font)에서 선택한 폰트만
// 내려받아 FontFace API로 로드 — 로드는 비차단, 로드 전 적용하면 빈 글자라 성공 후에만 적용.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getLocale, setLocale as setI18nLocale } from '../core/i18n/i18n';
import type { Locale } from '../core/i18n/i18n';
import { apiPaths, baseUrl } from '../core/apiPaths';
import { tokenStore } from '../core/tokenStore';

const LOCALE_KEY = 'app_locale';
const FONT_FAMILY_KEY = 'app_font_family';
const FONT_FILE_KEY = 'app_font_file';

export interface AppFont {
  /** 표시 이름 — 한글 폰트명은 고유명사라 로케일과 무관하게 그대로 보여준다. */
  label: string;
  /** null = 시스템 기본 (Pretendard 계열) */
  family: string | null;
  file: string | null;
}

/** 학생앱 카탈로그(constants/font.dart ko-kr)와 같은 family·파일명 — 서버 파일과 1:1. */
export const appFonts: AppFont[] = [
  { label: '', family: null, file: null }, // 기본 — label은 i18n(appSettings.fontDefault)로 렌더
  { label: '고운바탕', family: 'Ko_GowunBatang', file: 'GowunBatang-Regular.ttf' },
  { label: '런드리고딕', family: 'Ko_Laundry', file: 'Laundrygothic-Regular.otf' },
  { label: '에스코어드림', family: 'Ko_Dream', file: 'SCDream-Regular.otf' },
  { label: '강원교육새음체', family: 'Ko_Gangwon', file: 'Gangwon-Regular.ttf' },
  { label: '카페24슈퍼매직', family: 'Ko_Cafe24Supermagic', file: 'Cafe24Supermagic-Regular.ttf' },
];

const loadedFamilies = new Set<string>();

async function loadFont(family: string, file: string): Promise<boolean> {
  if (loadedFamilies.has(family)) return true;
  try {
    const token = tokenStore.access;
    const res = await fetch(`${baseUrl}${apiPaths.downloadFont(file)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return false;
    const face = new FontFace(family, await res.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    loadedFamilies.add(family);
    return true;
  } catch {
    return false;
  }
}

function applyFontFamily(family: string | null) {
  // tokens.css의 :root 폰트 스택 앞에 선택 폰트를 끼운다 — 기본은 오버라이드 제거
  document.documentElement.style.fontFamily = family
    ? `'${family}', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif`
    : '';
}

function initialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === 'en' || saved === 'ko') return saved;
  return navigator.language.startsWith('ko') ? 'ko' : 'en';
}

// 모듈 로드 시점에 i18n 전역을 먼저 세팅(첫 렌더부터 올바른 로케일)
setI18nLocale(initialLocale());

// 저장된 폰트는 시작을 막지 않고 재로드 — 끝나면 갈아탄다 (Flutter init와 동일)
const savedFontFamily = localStorage.getItem(FONT_FAMILY_KEY);
const savedFontFile = localStorage.getItem(FONT_FILE_KEY);
if (savedFontFamily && savedFontFile) {
  void loadFont(savedFontFamily, savedFontFile).then((ok) => {
    if (ok) applyFontFamily(savedFontFamily);
  });
}

interface AppSettingsValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** 저장된 선택(로드 전에도 설정 화면 체크 표시용) */
  selectedFontFamily: string | null;
  /** 반환: 성공 여부 (다운로드 실패 시 기존 폰트 유지) */
  setFont: (font: AppFont) => Promise<boolean>;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  const [selectedFontFamily, setSelectedFontFamily] = useState<string | null>(savedFontFamily);

  const setLocale = useCallback((next: Locale) => {
    setI18nLocale(next);
    localStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  }, []);

  const setFont = useCallback(async (font: AppFont) => {
    if (font.family === null) {
      applyFontFamily(null);
      setSelectedFontFamily(null);
      localStorage.removeItem(FONT_FAMILY_KEY);
      localStorage.removeItem(FONT_FILE_KEY);
      return true;
    }
    const ok = await loadFont(font.family, font.file!);
    if (!ok) return false;
    applyFontFamily(font.family);
    setSelectedFontFamily(font.family);
    localStorage.setItem(FONT_FAMILY_KEY, font.family);
    localStorage.setItem(FONT_FILE_KEY, font.file!);
    return true;
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, selectedFontFamily, setFont }),
    [locale, setLocale, selectedFontFamily, setFont],
  );
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
