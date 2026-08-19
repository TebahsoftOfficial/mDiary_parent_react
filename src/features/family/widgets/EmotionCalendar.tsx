// 감정 달력 — Flutter emotion_calendar.dart 이식 (학생앱 마음이야기 달력 미러).
// 날짜 셀 아래 그날 기록의 감정 이모티콘, 일=빨강·토=파랑, 일정은 셀 우상단 이모지(기본 📌).
// 기록이나 일정이 있는 날만 탭 가능. weekOf를 주면 그 주(일요일 시작) 한 줄만.
// 주간 모드에서 month 밖의 날짜는 흐리게 숫자만 (데이터는 월 단위 로드라 없음).
import type { ReactNode } from 'react';
import { emotionAssetPath } from '../../../app/emoticons';
import { tr } from '../../../core/i18n/i18n';
import type { FamilyEvent, MonthlyChildData } from '../models';

const WEEKDAY_KEYS = [
  'calendar.weekSun',
  'calendar.weekMon',
  'calendar.weekTue',
  'calendar.weekWed',
  'calendar.weekThu',
  'calendar.weekFri',
  'calendar.weekSat',
];

function weekdayColor(col: number): string {
  if (col === 0) return 'var(--seam-error)'; // 일요일 빨강
  if (col === 6) return 'var(--seam-info)'; // 토요일 파랑
  return 'var(--seam-text-secondary)';
}

export function EmotionCalendar({
  month,
  data,
  events = [],
  onDayTap,
  weekOf = null,
}: {
  /** 1일 */
  month: Date;
  data: MonthlyChildData;
  events?: FamilyEvent[];
  onDayTap?: (day: Date) => void;
  /** null = 월간 그리드 */
  weekOf?: Date | null;
}) {
  // 날짜 → 대표 감정 (일기 우선, 없으면 체크인)
  const emotions = new Map<number, string>();
  for (const c of data.checkins) {
    if (c.date && c.emotion) emotions.set(c.date.getDate(), c.emotion);
  }
  for (const d of data.diaries) {
    if (d.date && (d.emotions ?? '') !== '') {
      emotions.set(d.date.getDate(), d.emotions!.split(',')[0].trim());
    }
  }
  // 날짜 → 일정 이모지 (여러 개면 첫 번째, 이모지 없으면 📌)
  const dayEvents = new Map<number, string>();
  for (const e of events) {
    const d = e.date;
    if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
      if (!dayEvents.has(d.getDate())) dayEvents.set(d.getDate(), e.emoji === '' ? '📌' : e.emoji);
    }
  }

  const now = new Date();
  const isToday = (date: Date) =>
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const tapFor = (day: number) =>
    onDayTap && (emotions.has(day) || dayEvents.has(day))
      ? () => onDayTap(new Date(month.getFullYear(), month.getMonth(), day))
      : undefined;

  const rows: ReactNode[] = [];
  if (weekOf !== null) {
    // 주간 모드 — 일요일 시작 한 줄. 셀이 크고 일정 이모지도 크다.
    const sunday = new Date(weekOf.getFullYear(), weekOf.getMonth(), weekOf.getDate() - weekOf.getDay());
    rows.push(
      <div key="week" style={{ display: 'flex' }}>
        {Array.from({ length: 7 }, (_, col) => {
          const date = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + col);
          const inMonth =
            date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
          return (
            <DayCell
              key={col}
              day={date.getDate()}
              emotion={inMonth ? emotions.get(date.getDate()) : undefined}
              eventEmoji={inMonth ? dayEvents.get(date.getDate()) : undefined}
              color={inMonth ? weekdayColor(col) : 'var(--seam-text-disabled)'}
              isToday={isToday(date)}
              big
              onTap={inMonth ? tapFor(date.getDate()) : undefined}
            />
          );
        })}
      </div>,
    );
  } else {
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay(); // 일=0
    for (let row = 0; row * 7 - firstWeekday < daysInMonth; row++) {
      rows.push(
        <div key={row} style={{ display: 'flex' }}>
          {Array.from({ length: 7 }, (_, col) => {
            const day = row * 7 + col - firstWeekday + 1;
            const valid = day >= 1 && day <= daysInMonth;
            return (
              <DayCell
                key={col}
                day={valid ? day : null}
                emotion={valid ? emotions.get(day) : undefined}
                eventEmoji={valid ? dayEvents.get(day) : undefined}
                color={weekdayColor(col)}
                isToday={
                  valid &&
                  month.getFullYear() === now.getFullYear() &&
                  month.getMonth() === now.getMonth() &&
                  day === now.getDate()
                }
                onTap={valid ? tapFor(day) : undefined}
              />
            );
          })}
        </div>,
      );
    }
  }

  return (
    <div className="seam-card" style={{ padding: '14px 12px 12px' }}>
      <div style={{ display: 'flex' }}>
        {WEEKDAY_KEYS.map((key, col) => (
          <div
            key={key}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: weekdayColor(col),
            }}
          >
            {tr(key)}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>{rows}</div>
    </div>
  );
}

function DayCell({
  day,
  emotion,
  eventEmoji,
  color,
  isToday,
  big = false,
  onTap,
}: {
  day: number | null;
  emotion?: string;
  eventEmoji?: string;
  color: string;
  isToday: boolean;
  /** 주간 모드 — 셀·감정·일정 이모지를 키운다 (08-05 '일정 크게'). */
  big?: boolean;
  onTap?: () => void;
}) {
  const height = big ? 64 : 52;
  if (day === null) return <div style={{ flex: 1, height }} />;
  const emoSize = big ? 28 : 22;
  return (
    <div
      onClick={onTap}
      style={{
        flex: 1,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onTap ? 'pointer' : undefined,
        borderRadius: 'var(--seam-radius-sm)',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          background: isToday ? 'var(--seam-brand-tint-bg)' : undefined,
          fontSize: 12.5,
          fontWeight: isToday ? 700 : 500,
          color: isToday ? 'var(--seam-brand-point)' : color,
        }}
      >
        {day}
      </div>
      <div style={{ height: emoSize, marginTop: 2 }}>
        {emotion !== undefined && (
          <img
            src={emotionAssetPath(emotion)}
            width={emoSize}
            height={emoSize}
            alt={emotion}
            style={{ objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        )}
      </div>
      {eventEmoji !== undefined && (
        <span style={{ position: 'absolute', top: 0, right: 2, fontSize: big ? 14 : 13 }}>
          {eventEmoji}
        </span>
      )}
    </div>
  );
}
