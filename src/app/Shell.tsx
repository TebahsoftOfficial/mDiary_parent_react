// 하단 탭 셸 — 4탭(홈/이야기/리포트/마이페이지). 이야기 = 가족 공유이야기 피드(docs/14 §4-3).
import { NavLink, Outlet } from 'react-router-dom';
import { tr } from '../core/i18n/i18n';

function Icon({ name, filled }: { name: 'home' | 'stories' | 'reports' | 'myPage'; filled: boolean }) {
  const stroke = filled ? 'var(--seam-brand-point)' : 'var(--seam-text-secondary)';
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: filled ? 2.4 : 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'home') {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </svg>
    );
  }
  if (name === 'stories') {
    // 말풍선 + 책 페이지 느낌 — 공유이야기(가족 피드)
    return (
      <svg {...common}>
        <path d="M4 5.5h16a0 0 0 0 1 0 0v10a2 2 0 0 1-2 2H9l-4 3.5v-3.5H6a2 2 0 0 1-2-2v-10a0 0 0 0 1 0 0z" />
        <path d="M8.5 10h7M8.5 13h4.5" />
      </svg>
    );
  }
  if (name === 'reports') {
    return (
      <svg {...common}>
        <rect x="3.5" y="4" width="17" height="16" rx="2" />
        <path d="M8 15v-3M12 15V9M16 15v-5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" />
    </svg>
  );
}

const tabs = [
  { to: '/dashboard', labelKey: 'nav.home', icon: 'home' as const },
  { to: '/stories', labelKey: 'nav.stories', icon: 'stories' as const },
  { to: '/reports', labelKey: 'nav.reports', icon: 'reports' as const },
  { to: '/settings', labelKey: 'nav.myPage', icon: 'myPage' as const },
];

export function Shell() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      <nav
        style={{
          height: 64,
          display: 'flex',
          borderTop: '1px solid var(--seam-card-border)',
          background: 'var(--seam-surface-base)',
          flexShrink: 0,
        }}
      >
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            id={`tab_${t.labelKey.split('.')[1]}`}
            style={{ flex: 1, textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <span
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    padding: '2px 14px',
                    borderRadius: 'var(--seam-radius-full)',
                    background: isActive ? 'var(--seam-brand-tint-bg)' : 'transparent',
                    display: 'flex',
                  }}
                >
                  <Icon name={t.icon} filled={isActive} />
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--seam-brand-point)' : 'var(--seam-text-secondary)',
                  }}
                >
                  {tr(t.labelKey)}
                </span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
