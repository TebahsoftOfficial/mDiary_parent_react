// 포팅 진행 중 표시 — 화면 이식이 끝나면 라우트에서 교체된다 (docs/14 인벤토리 체크오프).
import { useNavigate } from 'react-router-dom';
import { tr } from '../core/i18n/i18n';
import { CharacterImage } from './emoticons';

export function PortingPlaceholder({ titleKey }: { titleKey: string }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        minHeight: '60dvh',
      }}
    >
      <CharacterImage mood="chat" size={80} idle />
      <h3 style={{ margin: 0 }}>{tr(titleKey)}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)' }}>
        React porting in progress
      </p>
      <button className="seam-btn seam-btn--ghost" style={{ maxWidth: 160 }} onClick={() => navigate(-1)}>
        ‹ {tr('common.cancel')}
      </button>
    </div>
  );
}
