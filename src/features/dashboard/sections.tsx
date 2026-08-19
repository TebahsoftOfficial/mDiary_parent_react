// 홈 대시보드 섹션 — Flutter sections/* 이식. 조립 순서는 DashboardScreen의 dashboardSections.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { tr } from '../../core/i18n/i18n';
import { fmtByKey } from '../../core/dateFmt';
import { CharacterImage, EmotionEmojiRow, reactionAssetPath } from '../../app/emoticons';
import { moodWeather, trafficGlow } from '../../app/mood';
import { showToast } from '../../app/ui';
import { repo } from '../family/repository';
import { eventDday } from '../family/models';
import type { ChildCard, FamilyEvent, FamilyHome, FeedItem } from '../family/models';
import { AddEventSheet } from '../family/widgets/AddEventSheet';
import { WriteDiarySheet } from '../family/widgets/WriteDiarySheet';
import { CommentsSheet } from '../family/widgets/CommentsSheet';

const sectionGap = { padding: '0 16px', marginBottom: 16 } as const;

// ── greeting ──
export function GreetingSection({ home }: { home: FamilyHome }) {
  const hasNews = home.children.some((c) => c.recordedToday);
  return (
    <div style={{ ...sectionGap, display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)' }}>
          {tr('home.greetingEyebrow')}
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 21, lineHeight: 1.35 }}>
          {hasNews ? tr('home.greetingHasNews') : tr('home.greetingNoNews')}
        </h1>
      </div>
      <CharacterImage mood="hello" size={88} idle />
    </div>
  );
}

// ── summary strip ──
export function SummaryStripSection({ home }: { home: FamilyHome }) {
  if (home.children.length === 0) return null;
  const total = home.children.length;
  const done = home.recordedToday;
  return (
    <div style={sectionGap}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--seam-surface-elevated)',
          borderRadius: 'var(--seam-radius-full)',
          padding: '10px 16px',
          fontSize: 13,
        }}
      >
        <span style={{ flex: 1 }}>
          {done === total
            ? tr('home.summaryAllDone')
            : tr('home.summaryProgress', { done, total })}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          {home.children.map((c) => (
            <span
              key={c.membershipId}
              title={c.nickname}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: c.recordedToday ? 'var(--seam-success)' : 'var(--seam-border-subtle)',
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ── pending (legacy join 승인) ──
export function PendingSection({ home, familyId }: { home: FamilyHome; familyId: number }) {
  const queryClient = useQueryClient();
  if (home.pending.length === 0) return null;
  return (
    <div style={sectionGap}>
      {home.pending.map((p) => (
        <div
          key={p.membershipId}
          className="seam-card"
          style={{ borderColor: 'var(--seam-brand-tint-border)', marginBottom: 8 }}
        >
          <strong style={{ fontSize: 14 }}>{tr('home.pendingRequest', { name: p.nickname })}</strong>
          <p style={{ margin: '4px 0 10px', fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
            {tr('home.pendingHint')}
          </p>
          <button
            className="seam-btn"
            style={{ height: 40 }}
            onClick={async () => {
              try {
                await repo.accept(familyId, p.membershipId);
                await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
              } catch (e) {
                showToast((e as Error).message);
              }
            }}
          >
            {tr('home.approve')}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── child cards — 오늘 기록한 자녀만, 밀도 3단계(1=히어로/2~4=스택/5+=2열) ──
function ChildCardView({ child, hero }: { child: ChildCard; hero: boolean }) {
  const navigate = useNavigate();
  const weather = moodWeather(child.latestScore);

  const onTap = () => {
    if (child.isSecret) {
      showToast(tr('home.secretStorySnack'));
      return;
    }
    if (child.latestDiaryId !== null) {
      navigate(`/child/${child.membershipId}/diary/${child.latestDiaryId}`, {
        state: { nickname: child.nickname },
      });
    }
  };

  return (
    <div
      className="seam-card"
      onClick={onTap}
      style={{
        cursor: child.latestDiaryId !== null && !child.isSecret ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: hero ? 20 : 14,
      }}
    >
      <img
        src={child.profileUrl ?? '/images/templates/default_user.png'}
        width={hero ? 56 : 44}
        height={hero ? 56 : 44}
        alt=""
        style={{ borderRadius: '50%', objectFit: 'cover', background: 'var(--seam-surface-elevated)' }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/images/templates/default_user.png';
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong style={{ fontSize: hero ? 16 : 14.5 }}>{child.nickname}</strong>
          {child.isSecret && <span title={tr('home.secretStorySnack')}>🔒</span>}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 700,
              color: weather.color,
              background: 'var(--seam-surface-elevated)',
              borderRadius: 'var(--seam-radius-full)',
              padding: '3px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {weather.emoji} {weather.label}
          </span>
        </div>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 12.5,
            color: 'var(--seam-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {child.latestEmotions
            ? tr('home.childLatestEmotion', { emotions: child.latestEmotions, when: '' })
            : tr('home.childNoStory')}
        </p>
        {child.keywords.length > 0 && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--seam-brand-point)' }}>
            {child.keywords.map((k) => `#${k}`).join(' ')}
          </p>
        )}
      </div>
      {child.latestDiaryId !== null && !child.isSecret && (
        <span style={{ color: 'var(--seam-text-disabled)' }}>›</span>
      )}
    </div>
  );
}

export function ChildCardsSection({ home }: { home: FamilyHome }) {
  const navigate = useNavigate();
  if (home.children.length === 0) {
    return (
      <div style={sectionGap}>
        <div className="seam-card" style={{ textAlign: 'center', padding: 24 }}>
          <CharacterImage mood="chat" size={64} />
          <h3 style={{ margin: '10px 0 6px' }}>{tr('home.emptyTitle')}</h3>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              whiteSpace: 'pre-line',
              color: 'var(--seam-text-secondary)',
            }}
          >
            {tr('home.emptyBody')}
          </p>
          <button className="seam-btn seam-btn--ghost" onClick={() => navigate('/settings')}>
            {tr('home.goAddChild')}
          </button>
        </div>
      </div>
    );
  }

  const recorded = home.children.filter((c) => c.recordedToday);
  if (recorded.length === 0) {
    return (
      <div style={sectionGap}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--seam-text-secondary)', textAlign: 'center' }}>
          {tr('home.noStoriesToday')}
        </p>
      </div>
    );
  }

  const compact = recorded.length >= 5;
  return (
    <div
      style={{
        ...sectionGap,
        display: compact ? 'grid' : 'flex',
        gridTemplateColumns: compact ? '1fr 1fr' : undefined,
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {recorded.map((c) => (
        <ChildCardView key={c.membershipId} child={c} hero={recorded.length === 1} />
      ))}
    </div>
  );
}

// ── starter (오늘의 대화 한마디) ──
export function StarterSection({ home }: { home: FamilyHome }) {
  const withStarter = home.children.filter((c) => c.starter);
  if (withStarter.length === 0) return null;
  return (
    <div style={{ ...sectionGap, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {withStarter.map((c) => (
        <div
          key={c.membershipId}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            background: 'var(--seam-brand-tint-bg)',
            borderRadius: 'var(--seam-radius-lg)',
            padding: 14,
          }}
        >
          <CharacterImage mood="chat" size={48} />
          <div>
            <strong style={{ fontSize: 13, color: 'var(--seam-brand-point)' }}>
              {tr('home.starterTitle', { name: c.nickname })}
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{c.starter}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── events (D-day 최대 3건) ──
export function EventsSection({ events, familyId }: { events: FamilyEvent[]; familyId: number }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = new Date();
  const upcoming = events
    .map((e) => ({ e, d: eventDday(e, today) }))
    .filter(({ d }) => d >= 0)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);

  return (
    <div style={sectionGap}>
      <div className="seam-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <strong style={{ flex: 1, fontSize: 14.5 }}>{tr('home.upcomingEvents')}</strong>
          <button
            onClick={() => setSheetOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--seam-brand-point)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {tr('home.addEvent')}
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)' }}>
            {tr('home.noEvents')}
          </p>
        ) : (
          upcoming.map(({ e, d }) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ fontSize: 20 }}>{e.emoji || '📌'}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                {e.title}
                {e.isLunar && (
                  <span style={{ fontSize: 11.5, color: 'var(--seam-text-secondary)', marginLeft: 4 }}>
                    {tr('home.lunarTag')}
                  </span>
                )}
                {e.repeatYearly && (
                  <span style={{ fontSize: 11.5, color: 'var(--seam-text-secondary)', marginLeft: 4 }}>
                    {tr('home.yearlyTag')}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: d === 0 ? '#fff' : 'var(--seam-brand-point)',
                  background: d === 0 ? 'var(--seam-brand)' : 'var(--seam-brand-tint-bg)',
                  borderRadius: 'var(--seam-radius-full)',
                  padding: '3px 10px',
                }}
              >
                {d === 0 ? tr('home.ddayToday') : tr('home.ddayN', { n: d })}
              </span>
            </div>
          ))
        )}
      </div>
      <AddEventSheet familyId={familyId} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

// ── my record (나도 오늘 기록하기) ──
export function MyRecordSection() {
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <div style={sectionGap}>
      <div
        className="seam-card"
        onClick={() => setSheetOpen(true)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <span style={{ fontSize: 24 }}>✍️</span>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 14.5 }}>{tr('home.myRecordTitle')}</strong>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
            {tr('home.myRecordSubtitle')}
          </p>
        </div>
        <span style={{ color: 'var(--seam-text-disabled)' }}>›</span>
      </div>
      <WriteDiarySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

// ── activity feed (최근 가족 소식) ──
const periods = [
  { value: 'week', labelKey: 'home.periodWeek' },
  { value: '2weeks', labelKey: 'home.period2Weeks' },
  { value: 'month', labelKey: 'home.periodMonth' },
] as const;

const REACTION_EMOJIS = ['love', 'sad', 'angry'] as const;

function FeedCard({ item, familyId }: { item: FeedItem; familyId: number }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const isDiary = item.type === 'diary';
  // 자녀 일기만 상세로 — 부모 글을 /child/ 라우트로 보내면 백엔드가 404 (감사 확정 버그)
  const openDetail =
    isDiary && item.diaryId !== null && item.authorRole === 'child'
      ? () =>
          navigate(`/child/${item.authorMembershipId}/diary/${item.diaryId}`, {
            state: { nickname: item.authorNickname },
          })
      : null;

  const toggle = async (emoji: string) => {
    if (!item.diaryId) return;
    try {
      await repo.toggleReaction(item.diaryId, emoji);
      await queryClient.invalidateQueries({ queryKey: ['feed', familyId] });
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  return (
    <div
      className="seam-card"
      onClick={openDetail ?? undefined}
      style={{
        boxShadow: trafficGlow(item.emotionsScore),
        marginBottom: 10,
        cursor: openDetail ? 'pointer' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <strong>{item.authorNickname}</strong>
        <span
          style={{
            fontSize: 11,
            color: 'var(--seam-text-secondary)',
            background: 'var(--seam-surface-elevated)',
            borderRadius: 'var(--seam-radius-full)',
            padding: '2px 8px',
          }}
        >
          {isDiary ? tr('home.typeDiary') : tr('home.typeCheckin')}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--seam-text-disabled)' }}>
          {item.date ? fmtByKey(item.date, 'home.dateFmt') : ''}
        </span>
      </div>
      {isDiary ? (
        <>
          <div style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <EmotionEmojiRow emotions={item.emotions} size={26} />
            {item.title && <strong style={{ fontSize: 14.5 }}>{item.title}</strong>}
          </div>
          {item.body && (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 13.5,
                color: 'var(--seam-text-primary)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.body}
            </p>
          )}
          {!item.isFull && (
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--seam-text-disabled)' }}>
              {tr('home.summaryOnlyNotice')}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
            {REACTION_EMOJIS.map((emoji) => {
              const count = item.reactions[emoji] ?? 0;
              const mine = item.myReaction === emoji;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggle(emoji);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    border: 'none',
                    background: mine ? 'var(--seam-brand-tint-bg)' : 'transparent',
                    borderRadius: 'var(--seam-radius-full)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    opacity: mine || item.myReaction === null ? 1 : 0.35,
                  }}
                >
                  <img src={reactionAssetPath(emoji)} width={20} height={20} alt={emoji} />
                  {count > 0 && <span style={{ fontSize: 12.5 }}>{count}</span>}
                </button>
              );
            })}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCommentsOpen(true);
              }}
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: 'transparent',
                fontSize: 12.5,
                color: 'var(--seam-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              💬 {item.commentCount}
            </button>
          </div>
          {item.diaryId && (
            <CommentsSheet
              diaryId={item.diaryId}
              authorName={item.authorNickname}
              open={commentsOpen}
              onClose={() => setCommentsOpen(false)}
            />
          )}
        </>
      ) : (
        <div style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <EmotionEmojiRow emotions={item.checkinEmotion} size={26} />
          <span style={{ fontSize: 13.5 }}>{item.checkinDescript || tr('home.checkinFallback')}</span>
        </div>
      )}
    </div>
  );
}

export function ActivityFeedSection({
  feed,
  familyId,
  period,
  onPeriodChange,
}: {
  feed: FeedItem[];
  familyId: number;
  period: string;
  onPeriodChange: (p: string) => void;
}) {
  return (
    <div style={sectionGap}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ flex: 1, fontSize: 15 }}>{tr('home.recentActivity')}</strong>
        <select
          className="seam-input"
          style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5, borderRadius: 'var(--seam-radius-full)' }}
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {tr(p.labelKey)}
            </option>
          ))}
        </select>
      </div>
      {feed.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)', textAlign: 'center' }}>
          {tr('home.activityEmpty')}
        </p>
      ) : (
        feed.map((item, i) => <FeedCard key={item.diaryId ?? `c${i}`} item={item} familyId={familyId} />)
      )}
    </div>
  );
}
