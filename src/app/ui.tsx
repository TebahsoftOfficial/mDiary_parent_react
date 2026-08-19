// 공용 UI — SeamBusyButton·SeamSheet(바텀시트)·토스트. 토큰은 tokens.css.
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** 스낵바 대응 — 프레임 하단 토스트. */
export function showToast(message: string) {
  const host = document.querySelector('.seam-frame') ?? document.body;
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'absolute',
    left: '16px',
    right: '16px',
    bottom: '84px',
    background: 'rgba(46,46,46,0.92)',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    zIndex: '200',
    textAlign: 'center',
  } satisfies Partial<CSSStyleDeclaration>);
  host.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function SeamBusyButton({
  label,
  busy,
  onClick,
  id,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  id?: string;
}) {
  return (
    <button className="seam-btn" id={id} disabled={busy} onClick={onClick}>
      {busy ? <span className="seam-spinner" /> : label}
    </button>
  );
}

/** 바텀시트 — 전부 흰색·상단 radius 20 고정(개별 색 지정 금지 규칙). */
export function SeamSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const host = document.querySelector('.seam-frame') ?? document.body;
  return createPortal(
    // portal이어도 React 이벤트는 소유자 트리로 버블된다 — 시트 클릭이 카드 onClick으로 새지 않게 차단
    <div
      className="seam-sheet-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="seam-sheet" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    host,
  );
}

/** 접기 섹션 — 시안 C-3 마이페이지의 Accordion (Flutter seam_accordion.dart 이식). */
export function SeamAccordion({
  title,
  children,
  initiallyExpanded = true,
}: {
  title: string;
  children: ReactNode;
  initiallyExpanded?: boolean;
}) {
  const [open, setOpen] = useState(initiallyExpanded);
  return (
    <div className="seam-card">
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      >
        <strong style={{ flex: 1, fontSize: 15.5 }}>{title}</strong>
        <span
          style={{
            color: 'var(--seam-text-secondary)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms',
            fontSize: 13,
          }}
        >
          ▼
        </span>
      </div>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}
