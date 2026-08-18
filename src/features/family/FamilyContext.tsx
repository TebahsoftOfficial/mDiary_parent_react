// 가족 부트 상태 — Flutter FamilyProvider의 families/loaded/currentFamilyId 축 이식.
// 홈·피드·일정 등 서버 데이터는 TanStack Query 훅으로 (화면 계층에서 useQuery).
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { repo } from './repository';
import type { MyFamilyEntry } from './models';
import { useAuth } from '../auth/AuthContext';

interface FamilyContextValue {
  families: MyFamilyEntry[];
  loaded: boolean;
  bootError: string | null;
  currentFamilyId: number | null;
  currentFamily: MyFamilyEntry | null;
  loadMine: () => Promise<void>;
  createFamily: (name: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [families, setFamilies] = useState<MyFamilyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const loadMine = useCallback(async () => {
    setBootError(null);
    try {
      const mine = await repo.mine();
      setFamilies(mine.filter((f) => f.isAccepted));
      setLoaded(true);
    } catch (e) {
      setBootError((e as Error).message);
    }
  }, []);

  // 로그인→가족 로드 / 로그아웃→전체 리셋. 연결 규칙은 이 한 곳에서만.
  useEffect(() => {
    if (status === 'loggedIn' && !loaded) {
      void loadMine();
    }
    if (status === 'loggedOut') {
      setFamilies([]);
      setLoaded(false);
      setBootError(null);
      queryClient.clear();
    }
  }, [status, loaded, loadMine, queryClient]);

  const createFamily = useCallback(
    async (name: string) => {
      await repo.createFamily(name);
      setLoaded(false);
      await loadMine();
      setLoaded(true);
    },
    [loadMine],
  );

  const currentFamily = families.length > 0 ? families[0] : null;

  const value = useMemo(
    () => ({
      families,
      loaded,
      bootError,
      currentFamilyId: currentFamily?.familyId ?? null,
      currentFamily,
      loadMine,
      createFamily,
    }),
    [families, loaded, bootError, currentFamily, loadMine, createFamily],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}

/** 가족이 확정된 화면 전용 — currentFamilyId가 null이면 가드가 이미 /setup으로 보냈다. */
export function useFamilyId(): number {
  const { currentFamilyId } = useFamily();
  if (currentFamilyId === null) throw new Error('family not selected');
  return currentFamilyId;
}
