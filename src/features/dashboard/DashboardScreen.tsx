// 홈 탭 — Flutter dashboard_screen.dart 이식. 섹션 조립 순서는 dashboardSections 한 곳에서.
// 멤버별 모드(마음이야기 MonthlyStoryView)는 다음 이식 단계 — 필터 시트는 자리만 동작.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tr } from '../../core/i18n/i18n';
import { SeamSheet } from '../../app/ui';
import { MonthlyStoryView } from '../family/widgets/MonthlyStoryView';
import { WriteDiarySheet } from '../family/widgets/WriteDiarySheet';
import { useFamily, useFamilyId } from '../family/FamilyContext';
import { useEvents, useFeed, useHome, useUnreadMessages } from './hooks';
import {
  ActivityFeedSection,
  ChildCardsSection,
  EventsSection,
  GreetingSection,
  MyRecordSection,
  PendingSection,
  StarterSection,
  SummaryStripSection,
} from './sections';

interface MemberSelection {
  membershipId: number | null;
  nickname: string;
  isSelf: boolean;
}

export function DashboardScreen() {
  const familyId = useFamilyId();
  const { currentFamily } = useFamily();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('week');
  const [member, setMember] = useState<MemberSelection | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);

  const home = useHome(familyId);
  const feed = useFeed(familyId, period);
  const events = useEvents(familyId);
  const unreadMessages = useUnreadMessages(familyId);

  const unread = (home.data?.unreadNotifications ?? 0) + (unreadMessages.data ?? 0);
  const members = currentFamily?.members ?? [];
  const myMembershipId = currentFamily?.membershipId ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          gap: 8,
          position: 'sticky',
          top: 0,
          background: 'var(--seam-surface-base)',
          zIndex: 10,
        }}
      >
        <button
          id="member_filter_btn"
          title={tr('home.memberFilterTooltip')}
          onClick={() => setFilterOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--seam-text-primary)" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>
          {member && !member.isSelf
            ? member.nickname
            : (home.data?.familyName ?? tr('home.familyFallback'))}
        </h2>
        <button
          id="mailbox_btn"
          title={tr('home.mailboxTooltip')}
          onClick={() => navigate('/mailbox')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'relative', display: 'flex' }}
        >
          <img
            src={unread > 0 ? '/images/layout/light/letter_open.png' : '/images/layout/light/letter_close.png'}
            width={26}
            height={26}
            alt=""
          />
          {unread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--seam-error)',
              }}
            />
          )}
        </button>
      </header>

      {member !== null ? (
        <>
          <MonthlyStoryView
            key={member.isSelf ? 'me' : member.membershipId}
            membershipId={member.isSelf ? null : member.membershipId}
            nickname={member.nickname}
          />
          {/* '나' 모드에서만 작성 FAB (자녀 이야기는 읽기 전용) */}
          {member.isSelf && (
            <>
              <button
                id="home_write_fab"
                title={tr('home.myRecordTitle')}
                onClick={() => setWriteOpen(true)}
                style={{
                  position: 'fixed',
                  bottom: 84,
                  right: 'max(16px, calc(50% - 204px))',
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--seam-radius-lg)',
                  border: 'none',
                  background: 'var(--seam-brand)',
                  color: '#fff',
                  fontSize: 22,
                  cursor: 'pointer',
                  boxShadow: 'var(--seam-shadow-high)',
                  zIndex: 20,
                }}
              >
                ✏️
              </button>
              <WriteDiarySheet open={writeOpen} onClose={() => setWriteOpen(false)} />
            </>
          )}
        </>
      ) : home.isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="seam-spinner" />
        </div>
      ) : home.isError ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--seam-text-secondary)' }}>{(home.error as Error).message}</p>
          <button className="seam-btn seam-btn--ghost" onClick={() => void home.refetch()}>
            {tr('common.retry')}
          </button>
        </div>
      ) : home.data ? (
        <div style={{ paddingBottom: 24 }}>
          <GreetingSection home={home.data} />
          <SummaryStripSection home={home.data} />
          <PendingSection home={home.data} familyId={familyId} />
          <ChildCardsSection home={home.data} />
          <StarterSection home={home.data} />
          <EventsSection events={events.data ?? []} familyId={familyId} />
          <MyRecordSection />
          <ActivityFeedSection
            feed={feed.data ?? []}
            familyId={familyId}
            period={period}
            onPeriodChange={setPeriod}
          />
        </div>
      ) : null}

      <SeamSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <h3 style={{ margin: '4px 0 12px', fontSize: 17 }}>{tr('home.memberFilterTitle')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
          <FilterRow
            label={tr('home.viewAll')}
            selected={member === null}
            onSelect={() => {
              setMember(null);
              setFilterOpen(false);
            }}
          />
          <FilterRow
            label={tr('kids.me')}
            selected={member?.isSelf === true}
            onSelect={() => {
              setMember({ membershipId: myMembershipId, nickname: tr('kids.me'), isSelf: true });
              setFilterOpen(false);
            }}
          />
          {members
            .filter((m) => m.role === 'child')
            .map((m) => (
              <FilterRow
                key={m.membershipId}
                label={m.nickname || tr('nav.childFallback')}
                selected={member?.membershipId === m.membershipId && !member.isSelf}
                onSelect={() => {
                  setMember({ membershipId: m.membershipId, nickname: m.nickname, isSelf: false });
                  setFilterOpen(false);
                }}
              />
            ))}
        </div>
      </SeamSheet>
    </div>
  );
}

function FilterRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 'var(--seam-radius-md)',
        border: `1px solid ${selected ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
        background: selected ? 'var(--seam-brand-tint-bg)' : 'transparent',
        fontSize: 14.5,
        fontWeight: selected ? 700 : 500,
        fontFamily: 'inherit',
        cursor: 'pointer',
        color: 'var(--seam-text-primary)',
        textAlign: 'left',
      }}
    >
      {label}
      {selected && <span style={{ marginLeft: 'auto', color: 'var(--seam-brand-point)' }}>✓</span>}
    </button>
  );
}
