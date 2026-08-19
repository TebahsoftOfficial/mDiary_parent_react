// 우체통 — Flutter mailbox_screen.dart 이식 (시안 C-7, 학생앱 우체통 미러).
// 알림(시스템) + 쪽지(받은/보낸)를 한 허브로 — 위험신호·기분저조·월간보고서·스트릭 + 가족 쪽지.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { fmt } from '../../../core/dateFmt';
import { SeamBusyButton, SeamSheet, showToast } from '../../../app/ui';
import { CharacterImage, EmotionEmojiRow } from '../../../app/emoticons';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import { notificationHelpers } from '../models';
import type { FamilyMessage, FamilyNotificationItem } from '../models';

type Box = 'notifications' | 'received' | 'sent';

export function MailboxScreen() {
  const familyId = useFamilyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [box, setBox] = useState<Box>('notifications');
  const [sendOpen, setSendOpen] = useState(false);

  const notifications = useQuery({
    queryKey: ['notifications', familyId],
    queryFn: () => repo.notifications(familyId),
    enabled: box === 'notifications',
  });
  const messages = useQuery({
    queryKey: ['messages', familyId, box],
    queryFn: () => repo.messages(familyId, box as 'received' | 'sent'),
    enabled: box !== 'notifications',
  });

  // 받은함을 열면 읽음 처리 (미읽음 배지 해소 — 홈 배지 쿼리도 재동기화)
  const receivedUnread =
    box === 'received' ? (messages.data?.items.filter((m) => m.readAt === null) ?? []) : [];
  useEffect(() => {
    if (receivedUnread.length === 0) return;
    void Promise.allSettled(
      receivedUnread.map((m) => repo.markMessageRead(familyId, m.id)),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['messagesUnread', familyId] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivedUnread.length, familyId]);

  const openNotification = (n: FamilyNotificationItem) => {
    if (notificationHelpers.isUnread(n)) {
      // 읽음 처리 — 실패해도 상세는 연다 (배지는 다음 로드에서 재동기화)
      void repo
        .markNotificationRead(familyId, n.id)
        .then(() => {
          queryClient.setQueryData<{ items: FamilyNotificationItem[]; unreadCount: number }>(
            ['notifications', familyId],
            (d) =>
              d
                ? {
                    unreadCount: Math.max(0, d.unreadCount - 1),
                    items: d.items.map((e) => (e.id === n.id ? { ...e, readAt: new Date() } : e)),
                  }
                : d,
          );
          void queryClient.invalidateQueries({ queryKey: ['home', familyId] });
        })
        .catch(() => undefined);
    }
    navigate(`/mailbox/notification/${n.id}`);
  };

  const activeQuery = box === 'notifications' ? notifications : messages;

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
        <h3 style={{ margin: 0, fontSize: 16 }}>{tr('mailbox.title')}</h3>
      </header>

      <div style={{ display: 'flex', gap: 8, padding: '8px 20px 4px', flexShrink: 0 }}>
        {(
          [
            ['notifications', tr('mailbox.tabNotifications')],
            ['received', tr('mailbox.received')],
            ['sent', tr('mailbox.sent')],
          ] as [Box, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            id={`mailbox_box_${value}`}
            onClick={() => setBox(value)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--seam-radius-full)',
              border: `1px solid ${box === value ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
              background: box === value ? 'var(--seam-brand)' : 'var(--seam-surface-base)',
              color: box === value ? '#fff' : 'var(--seam-text-secondary)',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeQuery.isError ? (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <p style={{ color: 'var(--seam-error)', fontSize: 13 }}>
              {(activeQuery.error as Error).message}
            </p>
            <button
              className="seam-btn"
              style={{ maxWidth: 160, margin: '12px auto 0' }}
              onClick={() => void activeQuery.refetch()}
            >
              {tr('common.retry')}
            </button>
          </div>
        ) : activeQuery.isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', paddingTop: 40 }}>
            <span className="seam-spinner" />
          </div>
        ) : box === 'notifications' ? (
          (notifications.data?.items.length ?? 0) === 0 ? (
            <EmptyState message={tr('mailbox.emptyNotifications')} />
          ) : (
            notifications.data!.items.map((n) => (
              <NotificationCard key={n.id} notification={n} onTap={() => openNotification(n)} />
            ))
          )
        ) : (messages.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            message={box === 'received' ? tr('mailbox.emptyReceived') : tr('mailbox.emptySent')}
          />
        ) : (
          messages.data!.items.map((m) => (
            <MessageCard key={m.id} message={m} showSender={box === 'received'} />
          ))
        )}
      </div>

      {box !== 'notifications' && (
        <button
          id="mailbox_write_fab"
          title={tr('mailbox.sendTitle')}
          onClick={() => setSendOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
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
      )}
      <SendMessageSheet
        familyId={familyId}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => setBox('sent')}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 48 }}>
      <CharacterImage mood="chat" size={80} idle />
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 13,
          color: 'var(--seam-text-secondary)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message}
      </p>
    </div>
  );
}

/** 알림 카드 (시안 C-7) — 타입 배지 + 제목 + 본문 1줄 + 시간 + 미읽음 점. */
const TYPE_COLORS: Record<string, string> = {
  risk_signal: 'var(--seam-error)',
  mood_low: 'var(--seam-warning)',
  monthly_report: 'var(--seam-brand)',
  streak: 'var(--seam-success)',
  schedule: 'var(--seam-info)', // 가족 일정 리마인더 (Phase 2)
  // 가족이 내 이야기에 남긴 반응 (Phase 7) — 자녀 우체통과 짝을 이룬다
  comment: 'var(--seam-brand)',
  reaction: 'var(--seam-brand-secondary)',
};

const TYPE_ICONS: Record<string, string> = {
  risk_signal: '❗',
  schedule: '📅',
  comment: '💬',
  reaction: '💗',
};

export function NotificationCard({
  notification: n,
  onTap,
}: {
  notification: FamilyNotificationItem;
  onTap: () => void;
}) {
  const color = TYPE_COLORS[n.notifType] ?? 'var(--seam-brand)';
  const isRisk = n.notifType === 'risk_signal';
  const isUnread = notificationHelpers.isUnread(n);
  return (
    <div
      id={`notification_card_${n.id}`}
      className="seam-card"
      onClick={onTap}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 10,
        cursor: 'pointer',
        border: isRisk && isUnread ? `1px solid ${color}` : undefined,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--seam-radius-md)',
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          fontSize: 18,
        }}
      >
        {TYPE_ICONS[n.notifType] ?? '📢'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 'var(--seam-radius-full)',
              fontSize: 10.5,
              fontWeight: 700,
              flexShrink: 0,
              background: isRisk ? color : `color-mix(in srgb, ${color} 16%, transparent)`,
              color: isRisk ? '#fff' : 'var(--seam-text-primary)',
            }}
          >
            {tr(`noti.type.${n.notifType}`)}
          </span>
          <strong
            style={{
              flex: 1,
              fontSize: 13.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {n.title}
          </strong>
          {isUnread && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--seam-brand-secondary)',
                flexShrink: 0,
              }}
            />
          )}
        </div>
        {n.body !== '' && (
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
            {n.body}
          </p>
        )}
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--seam-text-disabled)' }}>
          {fmt(n.createdAt, tr('mailbox.dateFmt'))}
        </p>
      </div>
    </div>
  );
}

function MessageCard({ message, showSender }: { message: FamilyMessage; showSender: boolean }) {
  const who = showSender
    ? message.senderNickname
    : tr('mailbox.toName', { name: message.receiverNickname });
  return (
    <div
      className="seam-card"
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}
    >
      {message.emotion !== '' && <EmotionEmojiRow emotions={message.emotion} size={28} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <strong style={{ flex: 1, fontSize: 14 }}>{who}</strong>
          <span style={{ fontSize: 11.5, color: 'var(--seam-text-disabled)' }}>
            {fmt(message.createdAt, tr('mailbox.dateFmt'))}
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {message.text}
        </p>
      </div>
    </div>
  );
}

/** 쪽지 보내기 시트 — 받는 사람(자녀) + 감정 + 내용. */
const MESSAGE_EMOTIONS = ['사랑', '감사', '행복', '기쁨', '걱정', '보통'];

function SendMessageSheet({
  familyId,
  open,
  onClose,
  onSent,
}: {
  familyId: number;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const queryClient = useQueryClient();
  const home = useQuery({
    queryKey: ['home', familyId],
    queryFn: () => repo.home(familyId),
    enabled: open,
  });
  const childList = home.data?.children ?? [];
  const [receiver, setReceiver] = useState<number | null>(null);
  const [emotion, setEmotion] = useState('사랑');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (receiver === null || text.trim() === '') {
      showToast(tr('mailbox.validation'));
      return;
    }
    setBusy(true);
    try {
      await repo.sendMessage(familyId, {
        receiverMembershipId: receiver,
        text: text.trim(),
        emotion,
      });
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['messages', familyId] });
      onClose();
      onSent();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeamSheet open={open} onClose={onClose}>
      <h3 style={{ margin: '4px 0 12px', fontSize: 18 }}>{tr('mailbox.sendTitle')}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {childList.map((child) => (
          <button
            key={child.membershipId}
            id={`send_to_${child.membershipId}`}
            onClick={() => setReceiver(child.membershipId)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--seam-radius-full)',
              border: 'none',
              background:
                receiver === child.membershipId ? 'var(--seam-brand)' : 'var(--seam-surface-sunken)',
              color: receiver === child.membershipId ? '#fff' : 'var(--seam-text-secondary)',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {child.nickname}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {MESSAGE_EMOTIONS.map((e) => (
          <button
            key={e}
            id={`send_emotion_${e}`}
            onClick={() => setEmotion(e)}
            style={{
              padding: 6,
              borderRadius: '50%',
              border: `1px solid ${emotion === e ? 'var(--seam-brand)' : 'transparent'}`,
              background: emotion === e ? 'var(--seam-brand-tint-bg)' : 'transparent',
              cursor: 'pointer',
              lineHeight: 0,
            }}
          >
            <EmotionEmojiRow emotions={e} size={26} />
          </button>
        ))}
      </div>
      <textarea
        id="send_text_input"
        className="seam-input"
        rows={3}
        maxLength={500}
        value={text}
        placeholder={tr('mailbox.textHint')}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', resize: 'none', fontSize: 14, marginTop: 12 }}
      />
      <div style={{ marginTop: 10, paddingBottom: 4 }}>
        <SeamBusyButton id="send_submit_btn" label={tr('mailbox.send')} busy={busy} onClick={() => void submit()} />
      </div>
    </SeamSheet>
  );
}
