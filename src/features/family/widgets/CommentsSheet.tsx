// 댓글 시트 (피드 카드용) — Flutter comments_sheet.dart 이식. 닫힐 때 목록 invalidate로 댓글 수 동기화.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { fmtByKey } from '../../../core/dateFmt';
import { SeamSheet, showToast } from '../../../app/ui';
import { repo } from '../repository';

export function CommentsSheet({
  diaryId,
  authorName,
  open,
  onClose,
}: {
  diaryId: number;
  authorName: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ['comments', diaryId],
    queryFn: () => repo.comments(diaryId),
    enabled: open,
  });

  const close = () => {
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    onClose();
  };

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await repo.addComment(diaryId, text.trim());
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['comments', diaryId] });
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeamSheet open={open} onClose={close}>
      <h3 style={{ margin: '4px 0 12px', fontSize: 17 }}>
        {tr('comments.title', { name: authorName })}
      </h3>
      <div style={{ minHeight: 120, maxHeight: '45dvh', overflowY: 'auto' }}>
        {items && items.length === 0 && (
          <p
            style={{
              textAlign: 'center',
              whiteSpace: 'pre-line',
              fontSize: 13,
              color: 'var(--seam-text-secondary)',
              padding: '24px 0',
            }}
          >
            {tr('comments.empty')}
          </p>
        )}
        {(items ?? []).map((c) => (
          <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--seam-card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <strong style={{ color: c.isMine ? 'var(--seam-brand-point)' : 'var(--seam-text-primary)' }}>
                {c.nickname}
              </strong>
              <span style={{ color: 'var(--seam-text-disabled)' }}>
                {fmtByKey(c.createdAt, 'comments.dateFmt')}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{c.text}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          className="seam-input"
          placeholder={tr('comments.inputHint')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <button
          className="seam-btn"
          style={{ width: 72, height: 46, flexShrink: 0 }}
          disabled={busy}
          onClick={submit}
        >
          {busy ? <span className="seam-spinner" /> : '↑'}
        </button>
      </div>
    </SeamSheet>
  );
}
