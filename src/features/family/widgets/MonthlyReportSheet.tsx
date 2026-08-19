// 월간 보고서 미리보기 모달 — Flutter monthly_report_sheet.dart 이식 (시안 C-10).
// 알림 상세 위에 딤(20%)+카드로 겹쳐 뜬다. 서버는 집계 JSON만 주고 여기서 렌더,
// Save는 카드 영역 html2canvas PNG 캡처.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { repo } from '../repository';
import type { MonthlyReportData } from '../models';

export function MonthlyReportSheet({
  open,
  onClose,
  familyId,
  membershipId,
  year,
  month,
}: {
  open: boolean;
  onClose: () => void;
  familyId: number;
  membershipId: number;
  year: number;
  month: number;
}) {
  const report = useQuery({
    queryKey: ['monthlyReport', familyId, membershipId, year, month],
    queryFn: () => repo.monthlyReport(familyId, membershipId, year, month),
    enabled: open,
  });
  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving || !captureRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2.5,
        backgroundColor: '#ffffff', // 캡처 배경 보장
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `seamspace_report_${year}_${month}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(tr('report.saved'));
      }
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const host = document.querySelector('.seam-frame') ?? document.body;
  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.2)', // 시안: 딤 20%
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}
      >
        <button
          id="report_save_btn"
          disabled={saving || !report.isSuccess}
          onClick={() => void save()}
          style={{
            border: 'none',
            borderRadius: 'var(--seam-radius-md)',
            background: '#fff',
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {saving ? '…' : `⬇ ${tr('report.save')}`}
        </button>
        <button
          id="report_close_btn"
          onClick={onClose}
          style={{
            border: 'none',
            borderRadius: 'var(--seam-radius-md)',
            background: '#fff',
            padding: '8px 12px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          overflowY: 'auto',
          borderRadius: 'var(--seam-radius-xl)',
          background: 'var(--seam-surface-base)',
        }}
      >
        {report.isError ? (
          <p style={{ margin: 0, padding: 24, color: 'var(--seam-error)', fontSize: 14 }}>
            {(report.error as Error).message}
          </p>
        ) : !report.data ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}>
            <span className="seam-spinner" />
          </div>
        ) : (
          <ReportBody report={report.data} captureRef={captureRef} />
        )}
      </div>
    </div>,
    host,
  );
}

function ReportBody({
  report,
  captureRef,
}: {
  report: MonthlyReportData;
  captureRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={captureRef}
      style={{ background: 'var(--seam-surface-base)', padding: '18px 20px 20px' }}
    >
      <p
        style={{
          margin: 0,
          textAlign: 'center',
          fontSize: 12.5,
          fontWeight: 700,
          color: 'var(--seam-brand-point)',
        }}
      >
        {tr('report.title')} ·{' '}
        {fmt(new Date(report.year, report.month - 1, 1), tr('report.monthFmt'))}
      </p>
      <p style={{ margin: '4px 0 16px', textAlign: 'center', fontSize: 20, fontWeight: 700 }}>
        {report.childNickname}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatTile
          bg="var(--seam-brand-tint-bg)"
          valueColor="var(--seam-brand-point)"
          value={`${report.daysRecorded}`}
          label={tr('report.daysRecorded')}
        />
        <StatTile
          bg="color-mix(in srgb, var(--seam-warning) 14%, transparent)"
          valueColor="#b8860b"
          value={report.topEmotion ?? '–'}
          label={tr('report.topFeeling')}
          emoji={report.topEmotion ?? undefined}
        />
        <StatTile
          bg="color-mix(in srgb, var(--seam-success) 14%, transparent)"
          valueColor="var(--seam-success)"
          value={report.avgMood?.toFixed(1) ?? '–'}
          label={tr('report.avgMood')}
        />
      </div>
      <p style={{ margin: '18px 0 10px', fontSize: 14.5, fontWeight: 700 }}>
        {tr('report.moodTracking')}
      </p>
      <MoodChart report={report} />
      <p style={{ margin: '18px 0 8px', fontSize: 14.5, fontWeight: 700 }}>
        {tr('report.seamsSummary')}
      </p>
      <div
        style={{
          padding: 14,
          borderRadius: 'var(--seam-radius-md)',
          background: 'var(--seam-brand-tint-bg)',
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.seamsSummary}
        </p>
      </div>
    </div>
  );
}

function StatTile({
  bg,
  valueColor,
  value,
  label,
  emoji,
}: {
  bg: string;
  valueColor: string;
  value: string;
  label: string;
  emoji?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '12px 6px',
        borderRadius: 'var(--seam-radius-md)',
        background: bg,
        textAlign: 'center',
      }}
    >
      {emoji !== undefined ? (
        <>
          <EmotionEmojiRow emotions={emoji} size={22} />
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 12,
              fontWeight: 700,
              color: valueColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value}
          </p>
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            color: valueColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </p>
      )}
      <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--seam-text-secondary)' }}>
        {label}
      </p>
    </div>
  );
}

/** Mood Tracking — 일자 축 (요일 축은 시안 오류로 확정). 리포트 탭 차트와 동일 문법, brand 색. */
function MoodChart({ report }: { report: MonthlyReportData }) {
  const points = report.moodByDay
    .map((v, i) => ({ day: i + 1, avg: v }))
    .filter((p): p is { day: number; avg: number } => p.avg !== null);
  if (points.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          padding: '20px 0',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--seam-text-disabled)',
        }}
      >
        {tr('report.noRecords')}
      </p>
    );
  }
  const daysInMonth = report.moodByDay.length;
  const dayTicks = [];
  for (let d = 1; d <= daysInMonth; d += 7) dayTicks.push(d);
  return (
    <div style={{ height: 150 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="reportMoodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a95de4" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#a95de4" stopOpacity={0} />
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
            fill="url(#reportMoodFill)"
            isAnimationActive={false}
          />
          <Line
            dataKey="avg"
            type="monotone"
            stroke="#a95de4"
            strokeWidth={3}
            dot={{ r: 3, fill: '#a95de4', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
