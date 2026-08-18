// 앱 루트 — Provider 조립 + 440px 프레임. 로케일 변경은 key 리마운트로 반영(Flutter와 동일 전략).
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppSettingsProvider, useAppSettings } from './app/AppSettingsContext';
import { AuthProvider } from './features/auth/AuthContext';
import { FamilyProvider } from './features/family/FamilyContext';
import { AppRoutes } from './app/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function AppInner() {
  const { locale } = useAppSettings();
  return (
    <div className="seam-frame" key={`app_${locale}`}>
      <AuthProvider>
        <FamilyProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FamilyProvider>
      </AuthProvider>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppSettingsProvider>
        <AppInner />
      </AppSettingsProvider>
    </QueryClientProvider>
  );
}
