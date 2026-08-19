// 구성원 칩 바 — Flutter member_chip_bar.dart 이식 (이야기/리포트 탭 공용, docs/10 §5.1).
// 자녀 1명이든 8명이든 구조가 같다. leading으로 '나'·'우리 가족' 칩을 앞에 붙인다.
import type { ReactNode } from 'react';
import type { ChildCard } from '../models';

export function MemberChipBar({
  childList,
  selectedMembershipId,
  onSelected,
  leading,
}: {
  childList: ChildCard[];
  /** null이면 leading 칩 중 하나가 선택된 상태라는 뜻 (leading 쪽에서 관리) */
  selectedMembershipId: number | null;
  onSelected: (membershipId: number) => void;
  leading?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '10px 16px',
        flexShrink: 0,
      }}
    >
      {leading}
      {childList.map((child) => (
        <MemberChip
          key={child.membershipId}
          id={`member_chip_${child.membershipId}`}
          label={child.nickname}
          selected={child.membershipId === selectedMembershipId}
          onTap={() => onSelected(child.membershipId)}
        />
      ))}
    </div>
  );
}

export function MemberChip({
  id,
  label,
  selected,
  onTap,
}: {
  id?: string;
  label: string;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onTap}
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderRadius: 'var(--seam-radius-full)',
        border: `1px solid ${selected ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
        background: selected ? 'var(--seam-brand)' : 'var(--seam-surface-base)',
        color: selected ? '#fff' : 'var(--seam-text-secondary)',
        fontSize: 13.5,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
