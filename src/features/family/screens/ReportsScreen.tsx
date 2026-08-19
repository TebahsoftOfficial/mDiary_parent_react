// Care 탭(리포트) — Flutter reports_screen.dart 이식 (시안 C-1, 08-13 dev4 확정).
// 월간 보고서 카드(Save as image) + Mood Tracking 라인차트 + Top Feelings % 랭킹
// + Brightest/Lowest day 틴트 카드 + Frequent Keywords 칩 클라우드.
// LBTI·멘탈지수 카드는 마이페이지 Permissions 토글 연동으로 공존(08-14).
// 데이터는 학생앱과 동일하게 원천(월간 일기+체크인)을 클라가 집계한다 —
// 키워드는 full 공개 일기의 keywords 필드만(공개범위 서버 강제와 일관).
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import html2canvas from 'html2canvas';
import { tr } from '../../../core/i18n/i18n';
import { fmt } from '../../../core/dateFmt';
import { showToast } from '../../../app/ui';
import { EmotionEmojiRow } from '../../../app/emoticons';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import { splitKeywords } from '../models';
import type { ChildDiary, MonthlyChildData } from '../models';
import { MemberChip, MemberChipBar } from '../widgets/MemberChipBar';
import { MonthSelector } from '../widgets/MonthSelector';

export function ReportsScreen() {
  const familyId = useFamilyId();
  const home = useQuery({ queryKey: ['home', familyId], queryFn: () => repo.home(familyId) });
  const childList = home.data?.children ?? [];

  // 첫 자녀가 기본 선택 — 자녀가 없으면 '나' (Flutter 초기화 로직 동일)
  const [selected, setSelected] = useState<{ initialized: boolean; membershipId: number | null }>({
    initialized: false,
    membershipId: null,
  });
  if (!selected.initialized && home.isSuccess) {
    setSelected({
      initialized: true,
      membershipId: childList.length === 0 ? null : childList[0].membershipId,
    });
  }
  const isMe = selected.initialized && selected.membershipId === null;

  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const y = month.getFullYear();
  const m = month.getMonth() + 1;

  const monthly = useQuery({
    queryKey: ['monthly', selected.membershipId ?? 'me', y, m],
    queryFn: () =>
      selected.membershipId === null
        ? repo.myMonthly(y, m)
        : repo.childMonthly(familyId, selected.membershipId, y, m),
    enabled: selected.initialized,
  });

  // Permissions(멘탈지수·LBTI 표시) — 부가 데이터라 실패해도 리포트를 막지 않는다
  const option = useQuery({
    queryKey: ['familyOption', familyId],
    queryFn: () => repo.getOption(familyId),
    retry: false,
  });
  const showMental = (option.data?.show_mental_index as boolean | undefined) ?? true;
  const showLbti = (option.data?.show_lbti as boolean | undefined) ?? true;

  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  /** C-1 보고서 카드 액션 — 리포트 영역을 PNG로 캡처해 다운로드 (웹). */
  const saveAsImage = async () => {
    if (saving || !captureRef.current) return;
    setSaving(true);
    let ok = false;
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#f9f7fa', // surfaceElevated — PNG가 투명으로 나오지 않게
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `care_report_${y}_${String(m).padStart(2, '0')}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        ok = true;
      }
    } catch {
      ok = false;
    }
    setSaving(false);
    showToast(tr(ok ? 'reports.saveDone' : 'reports.saveFailed'));
  };

  const data = monthly.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header style={{ padding: '14px 20px 0' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{tr('reports.title')}</h2>
      </header>
      <MemberChipBar
        childList={childList}
        selectedMembershipId={isMe ? null : selected.membershipId}
        onSelected={(id) => setSelected({ initialized: true, membershipId: id })}
        leading={
          <MemberChip
            id="reports_chip_me"
            label={tr('reports.me')}
            selected={isMe}
            onTap={() => setSelected({ initialized: true, membershipId: null })}
          />
        }
      />
      <div style={{ padding: '0 20px 24px' }}>
        {/* C-1 헤더 서브타이틀 */}
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
          {tr('reports.subtitle')}
        </p>
        <MonthSelector month={month} onChanged={setMonth} />
        {monthly.isError ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <p style={{ fontSize: 13, color: 'var(--seam-error)' }}>
              {(monthly.error as Error).message}
            </p>
            <button
              id="reports_retry_btn"
              className="seam-btn"
              style={{ maxWidth: 160, margin: '12px auto 0' }}
              onClick={() => void monthly.refetch()}
            >
              {tr('common.retry')}
            </button>
          </div>
        ) : !data ? (
          <div style={{ display: 'grid', placeItems: 'center', paddingTop: 60 }}>
            <span className="seam-spinner" />
          </div>
        ) : (
          // Save as image가 이 영역을 통째로 캡처한다 — 배경을 명시해 PNG가 투명으로 나오지 않게.
          <div
            ref={captureRef}
            style={{
              background: 'var(--seam-surface-elevated)',
              padding: '4px 0',
              marginTop: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <MonthlyReportCard month={month} saving={saving} onSave={() => void saveAsImage()} />
            <CollapsibleCard title={tr('reports.moodTrackingTitle')}>
              <MoodTrackingChart data={data} month={month} />
            </CollapsibleCard>
            <CollapsibleCard title={tr('reports.topFeelingsTitle')}>
              <TopFeelingsList data={data} />
            </CollapsibleCard>
            <DayHighlights data={data} />
            <CollapsibleCard
              title={tr('reports.frequentKeywordsTitle')}
              subtitle={tr('reports.frequentKeywordsNote')}
            >
              <KeywordCloud data={data} />
            </CollapsibleCard>
            {/* 기존 위젯 공존 — 마이페이지 토글로 노출 제어 (08-14) */}
            {showMental && <MentalIndexCard data={data} />}
            {showLbti && <LbtiCard data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** C-1 'Apr Monthly Report' 카드 — violet 틴트 아이콘 + Save as image 액션. */
function MonthlyReportCard({
  month,
  saving,
  onSave,
}: {
  month: Date;
  saving: boolean;
  onSave: () => void;
}) {
  const monthLabel = fmt(month, tr('reports.reportMonthFmt'));
  return (
    <div className="seam-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--seam-brand-tint-bg)',
          borderRadius: 'var(--seam-radius-md)',
          fontSize: 20,
        }}
      >
        📄
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 15.5 }}>
          {tr('reports.monthlyReportTitle', { month: monthLabel })}
        </strong>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
          {tr('reports.saveAsImage')}
        </p>
      </div>
      <button
        id="report_save_image_btn"
        title={tr('reports.saveAsImage')}
        disabled={saving}
        onClick={onSave}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 18,
          color: 'var(--seam-text-secondary)',
          padding: 6,
        }}
      >
        {saving ? <span className="seam-spinner" style={{ width: 18, height: 18 }} /> : '⬇️'}
      </button>
    </div>
  );
}

/** C-1 접이식 카드 — 제목 + ^ 토글, 기본 펼침. */
function CollapsibleCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="seam-card">
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      >
        <strong style={{ flex: 1, fontSize: 16 }}>{title}</strong>
        <span
          style={{
            color: 'var(--seam-text-secondary)',
            transform: expanded ? 'none' : 'rotate(180deg)',
            transition: 'transform 150ms',
            fontSize: 14,
          }}
        >
          ⌃
        </span>
      </div>
      {subtitle !== undefined && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
          {subtitle}
        </p>
      )}
      {expanded && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

function NoRecords({ messageKey }: { messageKey: string }) {
  return (
    <p
      style={{
        margin: 0,
        padding: '12px 0',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--seam-text-disabled)',
      }}
    >
      {tr(messageKey)}
    </p>
  );
}

/** C-1 Mood Tracking — 일기·체크인을 합친 일자별 전체 평균 한 줄 (08-14).
 *  violet 라인 + 그라데이션 채움. */
function MoodTrackingChart({ data, month }: { data: MonthlyChildData; month: Date }) {
  const byDay = new Map<number, number[]>();
  for (const d of data.diaries) {
    if (d.date && d.emotionsScore !== null) {
      const day = d.date.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), d.emotionsScore]);
    }
  }
  for (const c of data.checkins) {
    if (c.date && c.score !== null) {
      const day = c.date.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), c.score]);
    }
  }
  const points = [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, scores]) => ({ day, avg: scores.reduce((a, b) => a + b, 0) / scores.length }));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  if (points.length === 0) return <NoRecords messageKey="reports.noRecords" />;

  const dayTicks = [];
  for (let d = 1; d <= daysInMonth; d += 7) dayTicks.push(d);
  return (
    <div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--seam-surface-sunken)" strokeDasharray="4 4" />
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, daysInMonth]}
              ticks={dayTicks}
              tick={{ fontSize: 10, fill: '#bdbdbd' }}
              stroke="var(--seam-border-subtle)"
              tickLine={false}
            />
            <YAxis
              domain={[-10, 10]}
              ticks={[-10, -5, 0, 5, 10]}
              tick={{ fontSize: 10, fill: '#bdbdbd' }}
              stroke="var(--seam-border-subtle)"
              tickLine={false}
            />
            <Area
              dataKey="avg"
              type="monotone"
              stroke="none"
              fill="url(#moodFill)"
              isAnimationActive={false}
            />
            <Line
              dataKey="avg"
              type="monotone"
              stroke="#7c3aed"
              strokeWidth={3}
              dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--seam-brand-point)',
          }}
        />
        <span style={{ fontSize: 11.5, color: 'var(--seam-text-secondary)' }}>
          {tr('reports.overallAverage')}
        </span>
      </div>
    </div>
  );
}

/** C-1 Top Feelings — 순위 + 이모티콘 + 색 막대 + %(전체 감정 언급 대비). */
function TopFeelingsList({ data }: { data: MonthlyChildData }) {
  // 시안 C-1 막대 색 순서: 노랑/빨강/파랑/보라/회색
  const barColors = [
    'var(--seam-warning)',
    'var(--seam-error)',
    'var(--seam-info)',
    'var(--seam-brand)',
    'var(--seam-text-disabled)',
  ];
  const counts = new Map<string, number>();
  for (const d of data.diaries) {
    for (const e of splitKeywords(d.emotions)) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  for (const c of data.checkins) {
    if ((c.emotion ?? '') !== '') counts.set(c.emotion!, (counts.get(c.emotion!) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length === 0) return <NoRecords messageKey="reports.noRecords" />;
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const maxCount = top[0][1];
  return (
    <div>
      {top.map(([emotion, count], i) => (
        <div
          key={emotion}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}
        >
          <strong style={{ width: 16, fontSize: 13, color: 'var(--seam-text-secondary)' }}>
            {i + 1}
          </strong>
          <EmotionEmojiRow emotions={emotion} size={26} />
          <span
            style={{
              width: 56,
              fontSize: 12.5,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {emotion}
          </span>
          <div
            style={{
              flex: 1,
              height: 10,
              background: 'var(--seam-surface-sunken)',
              borderRadius: 'var(--seam-radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max(8, (count / maxCount) * 100)}%`,
                height: '100%',
                background: barColors[i % barColors.length],
                borderRadius: 'var(--seam-radius-full)',
              }}
            />
          </div>
          <span
            style={{
              width: 36,
              textAlign: 'right',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--seam-text-secondary)',
            }}
          >
            {Math.round((count * 100) / total)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/** C-1 Brightest/Lowest day — 노랑/파랑 틴트 카드 나란히.
 *  1단계는 날짜 + 대표 감정 (+공개된 기록 일부) — 설명 문장은 AI 요약 후속 (FEATURE_PLAN §8). */
function DayHighlights({ data }: { data: MonthlyChildData }) {
  const scored = data.diaries
    .filter((d) => d.emotionsScore !== null && d.date !== null)
    .sort((a, b) => b.emotionsScore! - a.emotionsScore!);
  if (scored.length === 0) return null;
  const best = scored[0];
  const worst = scored[scored.length - 1];
  const showWorst = worst.id !== best.id;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <DayTile
        id="report_brightest_day"
        emoji="🌞"
        label={tr('reports.brightestDay')}
        labelColor="var(--seam-warning-tint-text)"
        tint="var(--seam-warning-tint-bg)"
        diary={best}
      />
      {showWorst && (
        <DayTile
          id="report_lowest_day"
          emoji="🌧️"
          label={tr('reports.lowestDay')}
          labelColor="var(--seam-info-tint-text)"
          tint="var(--seam-info-tint-bg)"
          diary={worst}
        />
      )}
    </div>
  );
}

function DayTile({
  id,
  emoji,
  label,
  labelColor,
  tint,
  diary,
}: {
  id: string;
  emoji: string;
  label: string;
  labelColor: string;
  tint: string;
  diary: ChildDiary;
}) {
  const when = diary.date ? fmt(diary.date, tr('reports.highlightDateFmt')) : '';
  const text = (diary.visibility === 'full' ? diary.content : diary.summary) ?? '';
  return (
    <div
      id={id}
      style={{ flex: 1, padding: 14, background: tint, borderRadius: 'var(--seam-radius-lg)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13 }}>{emoji}</span>
        <strong
          style={{
            fontSize: 12,
            color: labelColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </strong>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 15.5, fontWeight: 700 }}>{when}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <EmotionEmojiRow emotions={diary.emotions} size={20} />
        <span
          style={{
            fontSize: 12,
            color: 'var(--seam-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {splitKeywords(diary.emotions)[0] ?? ''}
        </span>
      </div>
      {text !== '' && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--seam-text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

/** C-1 Frequent Keywords — full 공개 일기의 keywords만 집계한 해시태그 칩. */
function KeywordCloud({ data }: { data: MonthlyChildData }) {
  const counts = new Map<string, number>();
  for (const d of data.diaries.filter((d) => d.visibility === 'full')) {
    for (const k of splitKeywords(d.keywords)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length === 0) return <NoRecords messageKey="reports.noKeywords" />;
  const maxCount = top[0][1];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {top.map(([keyword, count]) => (
        <span
          key={keyword}
          style={{
            padding: '7px 12px',
            borderRadius: 'var(--seam-radius-full)',
            background: 'var(--seam-brand-tint-bg)',
            // 자주 나온 키워드일수록 크게 (12~15)
            fontSize: 12 + 3 * (count / maxCount),
            fontWeight: 600,
            color: 'var(--seam-brand-point)',
          }}
        >
          #{keyword}
        </span>
      ))}
    </div>
  );
}

/** 멘탈지수 — 학생앱 마음관리 MentalHealthStat 미러.
 *  이번 달 일기의 스트레스/불안/우울/자존감(0~10)을 평균 게이지로. */
function MentalIndexCard({ data }: { data: MonthlyChildData }) {
  const avg = (values: (number | null)[]): number | null => {
    const list = values.filter((v): v is number => v !== null);
    if (list.length === 0) return null;
    return list.reduce((a, b) => a + b, 0) / list.length;
  };
  const stress = avg(data.diaries.map((d) => d.iStress));
  const anxiety = avg(data.diaries.map((d) => d.iAnxiety));
  const depress = avg(data.diaries.map((d) => d.iDepress));
  const confidence = avg(data.diaries.map((d) => d.iConfidence));
  const hasData = [stress, anxiety, depress, confidence].some((v) => v !== null);
  return (
    <div className="seam-card">
      <strong style={{ fontSize: 16 }}>{tr('reports.mentalIndexTitle')}</strong>
      <p style={{ margin: '2px 0 14px', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
        {tr('reports.mentalIndexDesc')}
      </p>
      {!hasData ? (
        <NoRecords messageKey="reports.noAnalysisData" />
      ) : (
        <>
          <IndexGauge label={tr('reports.stress')} value={stress} danger />
          <IndexGauge label={tr('reports.anxiety')} value={anxiety} danger />
          <IndexGauge label={tr('reports.depression')} value={depress} danger />
          {/* 자존감(iConfidence)은 높을수록 좋은 지표 — 초록 계열 */}
          <IndexGauge label={tr('reports.selfEsteem')} value={confidence} danger={false} />
        </>
      )}
    </div>
  );
}

function IndexGauge({
  label,
  value,
  danger,
}: {
  label: string;
  /** 0~10 */
  value: number | null;
  /** true = 높을수록 주의(빨강 계열), false = 높을수록 좋음(초록) */
  danger: boolean;
}) {
  const v = Math.min(10, Math.max(0, value ?? 0));
  let color = 'var(--seam-text-disabled)';
  if (value !== null) {
    if (danger) {
      color = v >= 7 ? 'var(--seam-error)' : v >= 4 ? 'var(--seam-warning)' : 'var(--seam-success)';
    } else {
      color = v >= 7 ? 'var(--seam-success)' : v >= 4 ? 'var(--seam-warning)' : 'var(--seam-error)';
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <span style={{ width: 52, fontSize: 12.5, fontWeight: 600 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 12,
          background: 'var(--seam-surface-sunken)',
          borderRadius: 'var(--seam-radius-full)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${(value === null ? 0 : v / 10) * 100}%`, height: '100%', background: color }} />
      </div>
      <span
        style={{
          width: 30,
          textAlign: 'right',
          fontSize: 12,
          color: 'var(--seam-text-secondary)',
        }}
      >
        {value === null ? '-' : v.toFixed(1)}
      </span>
    </div>
  );
}

/** 월간 LBTI — 학생앱 MBTIStat(I/E·S/N·F/T·P/J 4축) 미러. */
function LbtiCard({ data }: { data: MonthlyChildData }) {
  // 이번 달 일기들의 LBTI 글자 빈도로 각 축의 좌우 비율을 만든다 (학생앱 방식).
  const counts = new Map<string, number>();
  for (const d of data.diaries) {
    for (const ch of (d.mbti ?? '').toUpperCase()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  const axes: [string, string][] = [
    ['I', 'E'],
    ['S', 'N'],
    ['F', 'T'],
    ['P', 'J'],
  ];
  return (
    <div className="seam-card">
      <strong style={{ fontSize: 16 }}>{tr('reports.lbtiTitle')}</strong>
      <p style={{ margin: '2px 0 14px', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
        {tr('reports.lbtiDesc')}
      </p>
      {counts.size === 0 ? (
        <NoRecords messageKey="reports.noAnalysisData" />
      ) : (
        axes.map(([left, right]) => {
          const l = counts.get(left) ?? 0;
          const r = counts.get(right) ?? 0;
          // 왼쪽 글자 비율 (0.0~1.0, 데이터 없으면 중앙)
          const ratio = l + r === 0 ? 0.5 : l / (l + r);
          return <AxisBar key={left + right} left={left} right={right} ratio={ratio} />;
        })
      )}
    </div>
  );
}

function AxisBar({ left, right, ratio }: { left: string; right: string; ratio: number }) {
  // 프로토타입처럼 트랙 위에 채움 세그먼트(35%) — 우세 방향 쪽으로
  const fillPct = 35;
  const centerPct = (1 - ratio) * 100;
  const leftPct = Math.min(100 - fillPct, Math.max(0, centerPct - fillPct / 2));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
      <strong style={{ width: 18, fontSize: 13 }}>{left}</strong>
      <div
        style={{
          flex: 1,
          height: 12,
          position: 'relative',
          background: 'var(--seam-surface-sunken)',
          borderRadius: 'var(--seam-radius-full)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${leftPct}%`,
            top: 0,
            bottom: 0,
            width: `${fillPct}%`,
            background: 'var(--seam-brand)',
            borderRadius: 'var(--seam-radius-full)',
          }}
        />
      </div>
      <strong style={{ width: 18, fontSize: 13, textAlign: 'right' }}>{right}</strong>
    </div>
  );
}
