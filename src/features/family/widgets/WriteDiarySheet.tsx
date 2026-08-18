// 부모 간소 일기 작성 시트 — Flutter write_diary_sheet.dart 이식 (톡방 roomId 분기는 폐지로 제외).
// 감정 식별자는 서버 값·에셋 키와 1:1 — 절대 번역하지 않는다.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { emotionAssetPath } from '../../../app/emoticons';
import { SeamBusyButton, SeamSheet, showToast } from '../../../app/ui';
import { repo } from '../repository';

const emotionLabelKeys: Record<string, string> = {
  기쁨: 'write.emotionJoy',
  행복: 'write.emotionHappy',
  즐거움: 'write.emotionFun',
  신남: 'write.emotionExcited',
  감사: 'write.emotionGrateful',
  차분: 'write.emotionCalm',
  만족: 'write.emotionContent',
  피곤: 'write.emotionTired',
  걱정: 'write.emotionWorried',
  슬픔: 'write.emotionSad',
  짜증: 'write.emotionAnnoyed',
  우울: 'write.emotionDown',
};

const visibilities = [
  { value: 'full', labelKey: 'write.visFull', descKey: 'write.visFullDesc' },
  { value: 'summary', labelKey: 'write.visSummary', descKey: 'write.visSummaryDesc' },
  { value: 'secret', labelKey: 'write.visSecret', descKey: 'write.visSecretDesc' },
] as const;

export function WriteDiarySheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [emotion, setEmotion] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'full' | 'summary' | 'secret'>('summary');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setEmotion(null);
    setContent('');
    setVisibility('summary');
    onClose();
  };

  const submit = async () => {
    if (!emotion || !content.trim()) {
      showToast(tr('write.validation'));
      return;
    }
    setBusy(true);
    try {
      await repo.writeMyDiary({ content: content.trim(), emotions: emotion, visibility });
      await queryClient.invalidateQueries();
      showToast(tr('kids.diaryWritten'));
      onSaved?.();
      close();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeamSheet open={open} onClose={close}>
      <h3 style={{ margin: '4px 0 14px', fontSize: 18 }}>{tr('write.title')}</h3>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--seam-text-secondary)' }}>
        {tr('write.emotionLabel')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(emotionLabelKeys).map(([e, labelKey]) => (
          <button
            key={e}
            id={`write_emotion_${e}`}
            onClick={() => setEmotion(e)}
            style={{
              width: 64,
              padding: '8px 0',
              borderRadius: 'var(--seam-radius-md)',
              border: `1px solid ${emotion === e ? 'var(--seam-brand)' : 'transparent'}`,
              background: emotion === e ? 'var(--seam-brand-tint-bg)' : 'var(--seam-surface-elevated)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <img src={emotionAssetPath(e)} width={30} height={30} alt={e} />
            <div style={{ fontSize: 11.5, marginTop: 3, color: 'var(--seam-text-primary)' }}>
              {tr(labelKey)}
            </div>
          </button>
        ))}
      </div>
      <textarea
        className="seam-input"
        style={{ marginTop: 14, minHeight: 110, resize: 'vertical' }}
        placeholder={tr('write.contentHint')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0' }}>
        {visibilities.map((v) => (
          <label
            key={v.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--seam-radius-md)',
              border: `1px solid ${visibility === v.value ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
              background: visibility === v.value ? 'var(--seam-brand-tint-bg)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="visibility"
              checked={visibility === v.value}
              onChange={() => setVisibility(v.value)}
              style={{ accentColor: 'var(--seam-brand)' }}
            />
            <span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{tr(v.labelKey)}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
                {tr(v.descKey)}
              </span>
            </span>
          </label>
        ))}
      </div>
      <SeamBusyButton label={tr('write.submit')} busy={busy} onClick={submit} />
    </SeamSheet>
  );
}
