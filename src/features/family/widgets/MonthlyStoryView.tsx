// '마음이야기' 미러 — Flutter monthly_story_view.dart 이식.
// 월/주 셀렉터 + 감정 달력(+가족 일정) + 그 달(주)의 기록 카드. 주가 기본 (08-05 dev4).
// membershipId가 null이면 '나'(본인) 모드 — 본인 일기 API를 쓴다.
// 달력의 기록/일정 있는 날짜는 탭 가능 — 그날의 기록·일정 시트가 열린다(학생앱 미러).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { fmt } from '../../../core/dateFmt';
import { SeamSheet } from '../../../app/ui';
import { CharacterImage, EmotionEmojiRow } from '../../../app/emoticons';
import { trafficGlow } from '../../../app/mood';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import type { ChildCheckin, ChildDiary, FamilyEvent } from '../models';
import { AddEventSheet } from './AddEventSheet';
import { EmotionCalendar } from './EmotionCalendar';
import { MonthSelector, NavArrow } from './MonthSelector';

type CalView = 'week' | 'month';

const dayOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sundayOf = (d: Date) => {
  const day = dayOnly(d);
  day.setDate(day.getDate() - day.getDay());
  return day;
};
const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};
const sameDay = (a: Date | null, b: Date) =>
  a !== null &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function MonthlyStoryView({
  membershipId,
  nickname,
}: {
  /** null = 본인 */
  membershipId: number | null;
  nickname: string;
}) {
  const familyId = useFamilyId();
  const isSelf = membershipId === null;
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [view, setView] = useState<CalView>('week');
  const [weekStart, setWeekStart] = useState(() => sundayOf(new Date()));
  const [dayTapped, setDayTapped] = useState<Date | null>(null);
  const [addEventOpen, setAddEventOpen] = useState(false);

  const y = month.getFullYear();
  const m = month.getMonth() + 1;
  const monthly = useQuery({
    queryKey: ['monthly', membershipId ?? 'me', y, m],
    queryFn: () =>
      isSelf ? repo.myMonthly(y, m) : repo.childMonthly(familyId, membershipId, y, m),
  });
  // 가족 일정은 구성원 공통 — 실패해도 기록 표시를 막지 않는다.
  const eventsQuery = useQuery({
    queryKey: ['events', familyId, y, m],
    queryFn: () => repo.events(familyId, y, m),
    retry: false,
  });
  const events = eventsQuery.data ?? [];

  const inWeek = (d: Date | null) => {
    if (d === null) return false;
    const day = dayOnly(d);
    return day >= weekStart && day < addDays(weekStart, 7);
  };

  const changeMonth = (next: Date) => setMonth(next);

  const changeWeek = (deltaDays: number) => {
    const next = addDays(weekStart, deltaDays);
    if (next > sundayOf(new Date())) return; // 미래 주 금지
    setWeekStart(next);
    // 주가 다른 달로 넘어가면 그 달 데이터를 새로 로드 (주 시작일 기준)
    if (next.getFullYear() !== month.getFullYear() || next.getMonth() !== month.getMonth()) {
      changeMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  };

  const toggleView = (next: CalView) => {
    if (next === view) return;
    setView(next);
    if (next === 'week') {
      // 보던 달이 이번 달이면 오늘의 주, 아니면 그 달 1일의 주로 진입
      const current = new Date();
      setWeekStart(
        month.getFullYear() === current.getFullYear() && month.getMonth() === current.getMonth()
          ? sundayOf(current)
          : sundayOf(new Date(month.getFullYear(), month.getMonth(), 1)),
      );
    }
  };

  if (monthly.isError) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--seam-error)', fontSize: 13 }}>
            {(monthly.error as Error).message}
          </p>
          <button
            id="story_retry_btn"
            className="seam-btn"
            style={{ maxWidth: 160, margin: '12px auto 0' }}
            onClick={() => void monthly.refetch()}
          >
            {tr('common.retry')}
          </button>
        </div>
      </div>
    );
  }
  const data = monthly.data;
  if (!data) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <span className="seam-spinner" />
      </div>
    );
  }

  // 일기+체크인을 날짜 내림차순으로 병합해 카드로. 주간 모드에선 그 주만.
  const weekOnly = view === 'week';
  const entries: { date: Date; node: ReactNode }[] = [
    ...data.diaries
      .filter((d) => d.date !== null && (!weekOnly || inWeek(d.date)))
      .map((d) => ({
        date: d.date!,
        node: (
          <DiaryCard key={`d${d.id}`} diary={d} membershipId={membershipId} nickname={nickname} />
        ),
      })),
    ...data.checkins
      .filter((c) => c.date !== null && (!weekOnly || inWeek(c.date)))
      .map((c, i) => ({ date: c.date!, node: <CheckinCard key={`c${i}`} checkin={c} /> })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const weekEvents = weekOnly ? events.filter((e) => inWeek(e.date)) : events;

  const tappedDiaries = dayTapped ? data.diaries.filter((d) => sameDay(d.date, dayTapped)) : [];
  const tappedCheckins = dayTapped ? data.checkins.filter((c) => sameDay(c.date, dayTapped)) : [];
  const tappedEvents = dayTapped ? events.filter((e) => sameDay(e.date, dayTapped)) : [];

  return (
    <div style={{ padding: '4px 20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          {view === 'month' ? (
            <MonthSelector month={month} onChanged={changeMonth} />
          ) : (
            <WeekSelector
              weekStart={weekStart}
              onPrev={() => changeWeek(-7)}
              onNext={() => changeWeek(7)}
            />
          )}
        </div>
        <ViewToggle view={view} onChanged={toggleView} />
      </div>
      <div style={{ marginTop: 4 }}>
        <EmotionCalendar
          month={month}
          data={data}
          events={events}
          onDayTap={setDayTapped}
          weekOf={view === 'week' ? weekStart : null}
        />
      </div>
      {/* 일정은 캘린더로만 표시 (08-05) — 스트립이 등록 진입점이라 항상 노출. */}
      <div style={{ marginTop: 10 }}>
        <EventsStrip
          events={weekEvents}
          title={tr(view === 'week' ? 'story.weekEvents' : 'story.monthEvents')}
          onAdd={() => setAddEventOpen(true)}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <CharacterImage mood="basic" size={80} idle />
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13,
                color: 'var(--seam-text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {isSelf ? tr('story.emptySelf') : tr('story.emptyChild', { name: nickname })}
            </p>
          </div>
        ) : (
          entries.map((e, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              {e.node}
            </div>
          ))
        )}
      </div>

      <AddEventSheet familyId={familyId} open={addEventOpen} onClose={() => setAddEventOpen(false)} />

      {/* 달력 날짜 탭 → 그날의 기록·일정 시트 */}
      <SeamSheet open={dayTapped !== null} onClose={() => setDayTapped(null)}>
        {dayTapped && (
          <>
            <h3 style={{ margin: '4px 0 12px', fontSize: 16 }}>
              {fmt(dayTapped, tr('story.dateFmt'))}
            </h3>
            <div style={{ maxHeight: '60dvh', overflowY: 'auto' }}>
              {tappedEvents.map((e) => (
                <div
                  key={`e${e.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
                >
                  <span style={{ fontSize: 18 }}>{e.emoji === '' ? '📌' : e.emoji}</span>
                  <strong style={{ flex: 1, fontSize: 14 }}>{e.title}</strong>
                  <span style={{ fontSize: 11, color: 'var(--seam-text-secondary)' }}>
                    {tr('story.eventTag')}
                  </span>
                </div>
              ))}
              {tappedEvents.length > 0 && (tappedDiaries.length > 0 || tappedCheckins.length > 0) && (
                <hr
                  style={{
                    border: 'none',
                    borderTop: '0.8px solid var(--seam-border-subtle)',
                    margin: '4px 0',
                  }}
                />
              )}
              {tappedDiaries.map((d) => (
                <div key={`d${d.id}`} style={{ marginTop: 8 }}>
                  <DiaryCard
                    diary={d}
                    membershipId={membershipId}
                    nickname={nickname}
                    onOpen={() => setDayTapped(null)}
                  />
                </div>
              ))}
              {tappedCheckins.map((c, i) => (
                <div key={`c${i}`} style={{ marginTop: 8 }}>
                  <CheckinCard checkin={c} />
                </div>
              ))}
            </div>
          </>
        )}
      </SeamSheet>
    </div>
  );
}

/** 주 네비게이터 — ‹ 7.27 ~ 8.2 › (월 셀렉터의 주간판). */
function WeekSelector({
  weekStart,
  onPrev,
  onNext,
}: {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const end = addDays(weekStart, 6);
  const isCurrent = weekStart >= sundayOf(new Date());
  const pattern = tr('calendar.shortDateFmt');
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <NavArrow id="week_prev_btn" dir="prev" onClick={onPrev} />
      <strong style={{ fontSize: 16 }}>
        {fmt(weekStart, pattern)} ~ {fmt(end, pattern)}
      </strong>
      <NavArrow id="week_next_btn" dir="next" disabled={isCurrent} onClick={onNext} />
    </div>
  );
}

/** 주/월 단위 토글 — 주가 기본 (08-05). */
function ViewToggle({ view, onChanged }: { view: CalView; onChanged: (v: CalView) => void }) {
  const pill = (label: string, value: CalView, id: string) => {
    const selected = view === value;
    return (
      <button
        id={id}
        onClick={() => onChanged(value)}
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--seam-radius-full)',
          border: 'none',
          background: selected ? 'var(--seam-brand)' : 'transparent',
          color: selected ? '#fff' : 'var(--seam-text-secondary)',
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      style={{
        display: 'flex',
        padding: 3,
        marginRight: 4,
        background: 'var(--seam-surface-sunken)',
        borderRadius: 'var(--seam-radius-full)',
        flexShrink: 0,
      }}
    >
      {pill(tr('calendar.viewWeek'), 'week', 'cal_view_week_btn')}
      {pill(tr('calendar.viewMonth'), 'month', 'cal_view_month_btn')}
    </div>
  );
}

/** 우리집 일정 스트립 — 캘린더 아래, 일정 등록 진입점 포함 (08-05: 크게 표시). */
function EventsStrip({
  events,
  title,
  onAdd,
}: {
  events: FamilyEvent[];
  title: string;
  onAdd: () => void;
}) {
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  return (
    <div className="seam-card" style={{ padding: '8px 8px 10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <strong style={{ flex: 1, fontSize: 13.5 }}>{title}</strong>
        <button
          id="event_add_btn"
          onClick={onAdd}
          style={{
            border: 'none',
            background: 'none',
            fontSize: 13,
            color: 'var(--seam-brand-point)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '6px 8px',
          }}
        >
          {tr('home.addEvent')}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p style={{ margin: '0 0 6px', fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
          {tr('home.noEvents')}
        </p>
      ) : (
        sorted.map((e) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              paddingRight: 6,
            }}
          >
            <span style={{ fontSize: 20 }}>{e.emoji === '' ? '📌' : e.emoji}</span>
            <strong
              style={{
                flex: 1,
                fontSize: 14.5,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {e.title}
            </strong>
            <span style={{ fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
              {fmt(e.date, tr('story.dateShortFmt'))}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

/** 학생앱 DiaryCard2 미러 (radius16·margin4·padding12·traffic 글로우).
 *  자녀 글: 탭 → 상세 라우트. 본인 글도 같은 상세 화면 (07-31). */
function DiaryCard({
  diary,
  membershipId,
  nickname,
  onOpen,
}: {
  diary: ChildDiary;
  membershipId: number | null;
  nickname: string;
  /** 날짜 시트에서 열 때 시트를 먼저 닫는 용도 */
  onOpen?: () => void;
}) {
  const navigate = useNavigate();
  const reactionCount = Object.values(diary.reactions).reduce((sum, n) => sum + n, 0);
  const isFull = diary.visibility === 'full';
  const open = () => {
    onOpen?.();
    if (membershipId !== null) {
      navigate(`/child/${membershipId}/diary/${diary.id}`, { state: { nickname } });
    } else {
      navigate(`/me/diary/${diary.id}`);
    }
  };
  return (
    <div
      id={`month_diary_${diary.id}_tile`}
      onClick={open}
      style={{
        margin: 4,
        padding: 12,
        background: 'var(--seam-surface-base)',
        borderRadius: 'var(--seam-radius-lg)',
        border: '1px solid var(--seam-card-border)',
        boxShadow: trafficGlow(diary.emotionsScore),
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <strong
          style={{
            flex: 1,
            fontSize: 16,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {diary.date ? fmt(diary.date, tr('story.dateFmt')) : ''}
        </strong>
        <VisibilityPill isFull={isFull} />
      </div>
      <div style={{ marginTop: 6 }}>
        <EmotionEmojiRow emotions={diary.emotions} />
      </div>
      <hr
        style={{
          border: 'none',
          borderTop: '0.8px solid var(--seam-border-subtle)',
          margin: '8px 0 0',
        }}
      />
      <p
        style={{
          margin: '6px 0',
          fontSize: 14,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {(isFull ? diary.content : diary.summary) ?? ''}
      </p>
      {(reactionCount > 0 || diary.commentCount > 0) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 2,
            fontSize: 12,
            color: 'var(--seam-text-secondary)',
          }}
        >
          {reactionCount > 0 && <span>❤️ {reactionCount}</span>}
          {diary.commentCount > 0 && <span>💬 {diary.commentCount}</span>}
        </div>
      )}
    </div>
  );
}

function VisibilityPill({ isFull }: { isFull: boolean }) {
  return (
    <span
      style={{
        padding: '4px 9px',
        borderRadius: 'var(--seam-radius-full)',
        fontSize: 10.5,
        fontWeight: 700,
        background: isFull ? 'var(--seam-brand-tint-bg)' : 'var(--seam-surface-sunken)',
        color: isFull ? 'var(--seam-brand-point)' : 'var(--seam-text-secondary)',
        flexShrink: 0,
      }}
    >
      {isFull ? tr('diary.visFull') : tr('diary.visSummary')}
    </span>
  );
}

/** 학생앱 CheckinCard 미러 (라벨+설명+감정, 리액션 줄 없음). */
function CheckinCard({ checkin }: { checkin: ChildCheckin }) {
  return (
    <div
      style={{
        margin: 4,
        padding: 12,
        background: 'var(--seam-surface-base)',
        borderRadius: 'var(--seam-radius-lg)',
        border: '1px solid var(--seam-card-border)',
        boxShadow: trafficGlow(checkin.score),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <strong style={{ flex: 1, fontSize: 16 }}>
          {checkin.date ? fmt(checkin.date, tr('story.dateFmt')) : ''}
        </strong>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 'var(--seam-radius-full)',
            fontSize: 10.5,
            fontWeight: 700,
            background: 'var(--seam-surface-sunken)',
            color: 'var(--seam-text-secondary)',
          }}
        >
          {tr('story.checkin')}
        </span>
      </div>
      <hr
        style={{
          border: 'none',
          borderTop: '0.8px solid var(--seam-border-subtle)',
          margin: '8px 0',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p
          style={{
            flex: 1,
            margin: 0,
            fontSize: 14,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {checkin.descript ?? tr('story.checkinDefault')}
        </p>
        <EmotionEmojiRow emotions={checkin.emotion} size={40} />
      </div>
    </div>
  );
}
