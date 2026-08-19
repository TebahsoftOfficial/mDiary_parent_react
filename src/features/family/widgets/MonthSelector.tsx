// 월 네비게이터 — Flutter month_selector.dart 이식.
// ‹ 2026년 7월 › + 라벨 탭 시 월 그리드 시트(시안 C-2: 연도 스텝퍼 + 월 그리드, 미래 달 비활성).
// 리포트·홈 멤버별 모드 공용.
import { useState } from 'react';
import { tr } from '../../../core/i18n/i18n';
import { fmt } from '../../../core/dateFmt';
import { SeamSheet } from '../../../app/ui';

export function MonthSelector({
  month,
  onChanged,
}: {
  /** 항상 1일 */
  month: Date;
  onChanged: (month: Date) => void;
}) {
  const [gridOpen, setGridOpen] = useState(false);
  const now = new Date();
  const isCurrent = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <NavArrow
        id="month_prev_btn"
        dir="prev"
        onClick={() => onChanged(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
      />
      <button
        id="month_picker_btn"
        onClick={() => setGridOpen(true)}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 700,
          padding: '4px 6px',
          color: 'var(--seam-text-primary)',
          fontFamily: 'inherit',
        }}
      >
        {fmt(month, tr('calendar.monthFmt'))} ▾
      </button>
      <NavArrow
        id="month_next_btn"
        dir="next"
        disabled={isCurrent}
        onClick={() => onChanged(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
      />
      <MonthGridSheet
        open={gridOpen}
        initial={month}
        onClose={() => setGridOpen(false)}
        onPicked={(picked) => {
          setGridOpen(false);
          onChanged(picked);
        }}
      />
    </div>
  );
}

export function NavArrow({
  id,
  dir,
  disabled = false,
  onClick,
}: {
  id?: string;
  dir: 'prev' | 'next';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      disabled={disabled}
      onClick={onClick}
      style={{
        border: 'none',
        background: 'none',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 20,
        lineHeight: 1,
        padding: '6px 10px',
        color: disabled ? 'var(--seam-border-subtle)' : 'var(--seam-text-secondary)',
      }}
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

/** 시안 C-2 — 연도 ‹ › 스텝퍼 + 월 그리드. 미래 달은 비활성. */
function MonthGridSheet({
  open,
  initial,
  onClose,
  onPicked,
}: {
  open: boolean;
  initial: Date;
  onClose: () => void;
  onPicked: (month: Date) => void;
}) {
  const [year, setYear] = useState(initial.getFullYear());
  const now = new Date();
  return (
    <SeamSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NavArrow id="month_grid_year_prev_btn" dir="prev" onClick={() => setYear(year - 1)} />
        <strong style={{ fontSize: 17 }}>{year}</strong>
        <NavArrow
          id="month_grid_year_next_btn"
          dir="next"
          disabled={year >= now.getFullYear()}
          onClick={() => setYear(year + 1)}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginTop: 6,
          paddingBottom: 8,
        }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isFuture =
            year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth() + 1);
          const isSelected = year === initial.getFullYear() && m === initial.getMonth() + 1;
          return (
            <button
              key={m}
              id={`month_grid_cell_${m}`}
              disabled={isFuture}
              onClick={() => onPicked(new Date(year, m - 1, 1))}
              style={{
                padding: '10px 0',
                fontSize: 13.5,
                fontWeight: isSelected ? 700 : 600,
                fontFamily: 'inherit',
                borderRadius: 'var(--seam-radius-md)',
                border: `1px solid ${isSelected ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
                background: isSelected ? 'var(--seam-brand-tint-bg)' : 'transparent',
                color: isFuture
                  ? 'var(--seam-text-disabled)'
                  : isSelected
                    ? 'var(--seam-brand-point)'
                    : 'var(--seam-text-primary)',
                cursor: isFuture ? 'default' : 'pointer',
              }}
            >
              {fmt(new Date(year, m - 1, 1), tr('calendar.monthCellFmt'))}
            </button>
          );
        })}
      </div>
    </SeamSheet>
  );
}
