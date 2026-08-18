// 스플래시 — 부트 실패 시 재시도/로그아웃 탈출구 (Flutter _SplashScreen 이식).
import { tr } from '../core/i18n/i18n';
import { CharacterImage } from './emoticons';
import { useAuth } from '../features/auth/AuthContext';
import { useFamily } from '../features/family/FamilyContext';

export function SplashScreen() {
  const { logout } = useAuth();
  const { bootError, loadMine } = useFamily();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <CharacterImage mood="basic" size={96} idle />
      {bootError ? (
        <>
          <p style={{ margin: 0, color: 'var(--seam-text-secondary)', textAlign: 'center' }}>
            {tr('nav.familyLoadFailed')}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-error)', textAlign: 'center' }}>
            {bootError}
          </p>
          <button className="seam-btn" style={{ maxWidth: 220 }} onClick={() => void loadMine()}>
            {tr('common.retry')}
          </button>
          <button className="seam-btn seam-btn--ghost" style={{ maxWidth: 220 }} onClick={logout}>
            {tr('auth.logout')}
          </button>
        </>
      ) : (
        <span className="seam-spinner" />
      )}
    </div>
  );
}
