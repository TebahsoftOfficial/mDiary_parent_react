// 알림 상세 — Flutter notification_detail_screen.dart 이식 (시안 C-8 응급 / C-8b 기분저조 / C-9 월간보고서).
//
// 코칭 카피 원칙(서버 정책과 쌍):
// - 일기 원문을 인용하지 않는다 (서버가 payload에 아예 담지 않음)
// - 진단어·명령형 금지 — '하지 말 것' 중심 안내(응급) / 관찰+제안 1가지 청유형(기분저조)
// - 오탐 가능성 고지 + '도움이 됐나요?' 피드백
// - CTA 'Open the story'는 일기가 secret이면 표시하지 않는다 (완전은닉 불변식)
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { fmt } from '../../../core/dateFmt';
import { showToast } from '../../../app/ui';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import { notificationHelpers as nh } from '../models';
import type { FamilyNotificationItem } from '../models';
import { MonthlyReportSheet } from '../widgets/MonthlyReportSheet';

export function NotificationDetailScreen() {
  const { id } = useParams();
  const notificationId = Number(id);
  const familyId = useFamilyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // 목록 캐시에서 찾고, 새로고침 직행이면 목록을 로드해 찾는다
  const notifications = useQuery({
    queryKey: ['notifications', familyId],
    queryFn: () => repo.notifications(familyId),
  });
  const n = notifications.data?.items.find((e) => e.id === notificationId);

  const home = useQuery({ queryKey: ['home', familyId], queryFn: () => repo.home(familyId) });
  const childName = (() => {
    if (!n) return tr('noti.childFallback');
    const mid = nh.childMembershipId(n);
    if (mid === null) return tr('noti.childFallback');
    return (
      home.data?.children.find((c) => c.membershipId === mid)?.nickname ?? tr('noti.childFallback')
    );
  })();

  const sendFeedback = async (value: 'helpful' | 'not_really') => {
    if (!n || sendingFeedback) return;
    setSendingFeedback(true);
    try {
      await repo.notificationFeedback(familyId, n.id, value);
      queryClient.setQueryData<{ items: FamilyNotificationItem[]; unreadCount: number }>(
        ['notifications', familyId],
        (d) =>
          d
            ? { ...d, items: d.items.map((e) => (e.id === n.id ? { ...e, feedback: value } : e)) }
            : d,
      );
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSendingFeedback(false);
    }
  };

  const isRisk = n?.notifType === 'risk_signal';
  const isCoaching = n !== undefined && (n.notifType === 'risk_signal' || n.notifType === 'mood_low');

  /** CTA — 이야기 열기(위험신호·기분저조, secret 제외) / 월간 보고서 열기. */
  const cta = (() => {
    if (!n) return null;
    if (n.notifType === 'monthly_report') {
      const mid = nh.childMembershipId(n);
      const year = n.payload.year as number | undefined;
      const month = n.payload.month as number | undefined;
      return (
        <button
          id="noti_open_report_btn"
          className="seam-btn"
          onClick={() => {
            if (mid !== null && year !== undefined && month !== undefined) {
              // 시안 C-9→C-10: 탭 이동 없이 이 화면 위에 미리보기 모달을 겹쳐 띄운다
              setReportOpen(true);
            } else {
              navigate('/reports'); // 페이로드가 없는 구형 알림 폴백
            }
          }}
        >
          {tr('noti.detail.openReport')}
        </button>
      );
    }
    const mid = nh.childMembershipId(n);
    const diaryId = nh.diaryId(n);
    if (diaryId === null || nh.isSecretDiary(n)) return null;
    // 댓글·공감 알림은 '내 이야기'에 달린 것이라 자녀 상세 라우트가 없다 (Phase 7)
    if (nh.isOwnDiary(n)) {
      return (
        <button
          id="noti_open_story_btn"
          className="seam-btn"
          onClick={() => navigate(`/me/diary/${diaryId}`)}
        >
          {tr('noti.detail.openStory')}
        </button>
      );
    }
    if (mid === null) return null;
    return (
      <button
        id="noti_open_story_btn"
        className="seam-btn"
        onClick={() => navigate(`/child/${mid}/diary/${diaryId}`, { state: { nickname: childName } })}
      >
        {tr('noti.detail.openStory')}
      </button>
    );
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '10px 8px',
          borderBottom: '0.8px solid var(--seam-border-subtle)',
          background: 'var(--seam-surface-base)',
          flexShrink: 0,
        }}
      >
        <button
          aria-label={tr('common.cancel')}
          onClick={() => navigate(-1)}
          style={{
            border: 'none',
            background: 'none',
            fontSize: 22,
            lineHeight: 1,
            padding: '4px 10px',
            cursor: 'pointer',
            color: 'var(--seam-text-primary)',
          }}
        >
          ‹
        </button>
        <h3 style={{ margin: 0, fontSize: 16 }}>{tr('noti.detail.title')}</h3>
      </header>

      {!n ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          {notifications.isLoading ? (
            <span className="seam-spinner" />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--seam-text-secondary)' }}>
              {(notifications.error as Error | null)?.message ?? tr('mailbox.emptyNotifications')}
            </p>
          )}
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
            {isRisk && (
              <div
                id="noti_risk_banner"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 16px',
                  marginBottom: 20,
                  borderRadius: 'var(--seam-radius-md)',
                  background: 'color-mix(in srgb, var(--seam-error) 12%, transparent)',
                }}
              >
                <span style={{ fontSize: 15 }}>❗</span>
                <strong style={{ color: 'var(--seam-error)', fontSize: 14 }}>
                  {tr('noti.detail.riskBanner')}
                </strong>
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: 19 }}>{n.title}</h2>
            {n.body !== '' && (
              <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {n.body}
              </p>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--seam-text-disabled)' }}>
              {fmt(n.createdAt, tr('mailbox.dateFmt'))}
            </p>

            {isRisk ? (
              <TipsBox
                color="var(--seam-error)"
                title={tr('noti.detail.riskTipsTitle')}
                lines={[
                  tr('noti.detail.riskTip1'),
                  tr('noti.detail.riskTip2'),
                  tr('noti.detail.riskTip3'),
                ]}
              />
            ) : n.notifType === 'mood_low' ? (
              <TipsBox
                color="var(--seam-warning)"
                lines={[tr('noti.detail.moodTip', { name: childName })]}
              />
            ) : null}

            {isCoaching && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--seam-text-disabled)',
                }}
              >
                {tr('noti.detail.disclaimer')}
              </p>
            )}
            {isRisk && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15 }}>📢</span>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
                  {tr('noti.detail.riskCounsel')}
                </p>
              </div>
            )}
            {isCoaching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--seam-text-disabled)' }}>
                  {tr('noti.detail.helpfulQ')}
                </span>
                {(
                  [
                    ['helpful', tr('noti.detail.helpful')],
                    ['not_really', tr('noti.detail.notReally')],
                  ] as ['helpful' | 'not_really', string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    id={`noti_feedback_${value}`}
                    disabled={sendingFeedback}
                    onClick={() => void sendFeedback(value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--seam-radius-md)',
                      border: `1px solid ${n.feedback === value ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
                      background: n.feedback === value ? 'var(--seam-brand-tint-bg)' : 'transparent',
                      color:
                        n.feedback === value
                          ? 'var(--seam-brand-point)'
                          : 'var(--seam-text-secondary)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {cta !== null && <div style={{ padding: '0 24px 20px', flexShrink: 0 }}>{cta}</div>}
          {n.notifType === 'monthly_report' && (
            <MonthlyReportSheet
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              familyId={familyId}
              membershipId={nh.childMembershipId(n) ?? 0}
              year={(n.payload.year as number | undefined) ?? 0}
              month={(n.payload.month as number | undefined) ?? 0}
            />
          )}
        </>
      )}
    </div>
  );
}

/** 코칭 제안 박스 — 응급(핑크, 3줄) / 기분저조(노랑, 1줄 청유형). */
function TipsBox({ color, title, lines }: { color: string; title?: string; lines: string[] }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: 16,
        borderRadius: 'var(--seam-radius-md)',
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {title !== undefined && (
        <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700 }}>{title}</p>
      )}
      {lines.map((line, i) => (
        <p key={i} style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.5 }}>
          {lines.length > 1 ? '·  ' : ''}
          {line}
        </p>
      ))}
    </div>
  );
}
