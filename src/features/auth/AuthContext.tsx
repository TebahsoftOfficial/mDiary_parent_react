// 로그인 상태의 단일 출처 — Flutter AuthProvider 이식. 기존 mDiary(SEAMSPACE) 계정 로그인.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { postJson } from '../../core/apiClient';
import { apiPaths } from '../../core/apiPaths';
import { tokenStore } from '../../core/tokenStore';
import { tr } from '../../core/i18n/i18n';

export type AuthStatus = 'unknown' | 'loggedOut' | 'loggedIn';

interface TokenPair {
  access: string;
  refresh: string;
}

interface AuthContextValue {
  status: AuthStatus;
  login: (username: string, password: string) => Promise<void>;
  signup: (input: {
    email: string;
    password: string;
    name: string;
    nickname?: string;
    familyName?: string;
  }) => Promise<void>;
  spouseSignup: (input: {
    token: string;
    email: string;
    password: string;
    name: string;
    nickname?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('unknown');

  // bootstrap: 저장 토큰 유무로만 판정(만료는 첫 API 401 refresh가 처리)
  useEffect(() => {
    setStatus(tokenStore.access ? 'loggedIn' : 'loggedOut');
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await postJson<TokenPair>(
      apiPaths.login,
      { username, password },
      200,
      tr('auth.loginFailed'),
    );
    tokenStore.save(data.access, data.refresh);
    setStatus('loggedIn');
  }, []);

  const signup = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      nickname?: string;
      familyName?: string;
    }) => {
      const data = await postJson<{ tokens: TokenPair }>(
        apiPaths.signup,
        {
          email: input.email,
          password: input.password,
          name: input.name,
          nickname: input.nickname ?? '',
          family_name: input.familyName ?? '',
        },
        201,
        tr('auth.signupFailed'),
      );
      tokenStore.save(data.tokens.access, data.tokens.refresh);
      setStatus('loggedIn');
    },
    [],
  );

  const spouseSignup = useCallback(
    async (input: {
      token: string;
      email: string;
      password: string;
      name: string;
      nickname?: string;
    }) => {
      const data = await postJson<{ tokens: TokenPair }>(
        apiPaths.spouseSignup,
        {
          token: input.token,
          email: input.email,
          password: input.password,
          name: input.name,
          nickname: input.nickname ?? '',
        },
        201,
        tr('auth.signupFailed'),
      );
      tokenStore.save(data.tokens.access, data.tokens.refresh);
      setStatus('loggedIn');
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setStatus('loggedOut');
  }, []);

  const value = useMemo(
    () => ({ status, login, signup, spouseSignup, logout }),
    [status, login, signup, spouseSignup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
