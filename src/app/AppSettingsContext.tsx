// 앱 설정(언어) — Flutter AppSettingsProvider 이식. 폰트 로딩은 마이페이지 이식 때 FontFace API로.
// 로케일 변경 시 앱 루트를 key 리마운트해 tr() 정적 조회를 반영한다(Flutter와 동일 전략).
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getLocale, setLocale as setI18nLocale } from '../core/i18n/i18n';
import type { Locale } from '../core/i18n/i18n';

const LOCALE_KEY = 'app_locale';

function initialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === 'en' || saved === 'ko') return saved;
  return navigator.language.startsWith('ko') ? 'ko' : 'en';
}

// 모듈 로드 시점에 i18n 전역을 먼저 세팅(첫 렌더부터 올바른 로케일)
setI18nLocale(initialLocale());

interface AppSettingsValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  const setLocale = useCallback((next: Locale) => {
    setI18nLocale(next);
    localStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
