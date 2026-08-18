// 가족 일정 추가 시트 — Flutter add_event_sheet.dart 이식 (제목·날짜·이모지·음력·매년 반복).
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { SeamBusyButton, SeamSheet, showToast } from '../../../app/ui';
import { repo } from '../repository';

const emojis = ['🎂', '🎉', '✈️', '🏕️', '🎓', '💍', '🏥', '📌'];

export function AddEventSheet({
  familyId,
  open,
  onClose,
}: {
  familyId: number;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [emoji, setEmoji] = useState('🎂');
  const [isLunar, setIsLunar] = useState(false);
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTitle('');
    setDate('');
    onClose();
  };

  const submit = async () => {
    if (!title.trim() || !date) {
      showToast(tr('home.eventFormIncomplete'));
      return;
    }
    setBusy(true);
    try {
      await repo.addEvent(familyId, { title: title.trim(), date, isLunar, repeatYearly, emoji });
      await queryClient.invalidateQueries({ queryKey: ['events', familyId] });
      close();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeamSheet open={open} onClose={close}>
      <h3 style={{ margin: '4px 0 14px', fontSize: 18 }}>{tr('home.addEventTitle')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="seam-input"
          placeholder={tr('home.eventTitleLabel')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="seam-input"
          type="date"
          aria-label={tr('home.pickDate')}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                fontSize: 20,
                padding: '6px 10px',
                borderRadius: 'var(--seam-radius-md)',
                border: `1px solid ${emoji === e ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
                background: emoji === e ? 'var(--seam-brand-tint-bg)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={isLunar}
            onChange={(e) => setIsLunar(e.target.checked)}
            style={{ accentColor: 'var(--seam-brand)' }}
          />
          {tr('home.lunarLabel')}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={repeatYearly}
            onChange={(e) => setRepeatYearly(e.target.checked)}
            style={{ accentColor: 'var(--seam-brand)' }}
          />
          {tr('home.repeatYearlyLabel')}
        </label>
        <SeamBusyButton label={tr('home.addEventSubmit')} busy={busy} onClick={submit} />
      </div>
    </SeamSheet>
  );
}
