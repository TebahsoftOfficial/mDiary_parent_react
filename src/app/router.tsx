// 라우팅 + 가드 — Flutter go_router redirect 규칙 이식.
// unknown→/splash · loggedOut→/login · !loaded→/splash · 가족 없음→/setup · 그 외 허용 prefix 검사.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useFamily } from '../features/family/FamilyContext';
import { LoginScreen } from '../features/auth/LoginScreen';
import { SignupScreen } from '../features/auth/SignupScreen';
import { SplashScreen } from './SplashScreen';
import { FamilySetupScreen } from '../features/family/screens/FamilySetupScreen';
import { Shell } from './Shell';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { DiaryDetailScreen } from '../features/family/screens/DiaryDetailScreen';
import { ReportsScreen } from '../features/family/screens/ReportsScreen';
import { MailboxScreen } from '../features/family/screens/MailboxScreen';
import { NotificationDetailScreen } from '../features/family/screens/NotificationDetailScreen';
import { SettingsScreen } from '../features/family/screens/SettingsScreen';
import { StoriesScreen } from '../features/family/screens/StoriesScreen';

const ALLOWED_PREFIXES = ['/dashboard', '/stories', '/reports', '/settings', '/child/', '/me/', '/mailbox'];

function Guard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { loaded, currentFamilyId } = useFamily();
  const { pathname } = useLocation();

  let target: string | null = null;
  if (status === 'unknown') {
    if (pathname !== '/splash') target = '/splash';
  } else if (status === 'loggedOut') {
    if (pathname !== '/login' && pathname !== '/signup') target = '/login';
  } else {
    // loggedIn
    if (!loaded) {
      if (pathname !== '/splash') target = '/splash';
    } else if (currentFamilyId === null) {
      if (pathname !== '/setup') target = '/setup';
    } else if (!ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
      target = '/dashboard';
    }
  }

  if (target && target !== pathname) return <Navigate to={target} replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Guard>
      <Routes>
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/setup" element={<FamilySetupScreen />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/stories" element={<StoriesScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
        <Route path="/mailbox" element={<MailboxScreen />} />
        <Route path="/mailbox/notification/:id" element={<NotificationDetailScreen />} />
        <Route path="/child/:membershipId/diary/:diaryId" element={<DiaryDetailScreen />} />
        <Route path="/me/diary/:diaryId" element={<DiaryDetailScreen />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Guard>
  );
}
