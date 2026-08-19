// 이야기 상세 — Flutter diary_detail_screen.dart 이식.
// 본문(공개범위 준수) + SeamTalk + 공감(3종 토글) + 댓글(인라인 목록/입력·추천 문구 칩).
// membershipId가 없으면(=/me/diary/:id) 본인 글 모드 — 같은 화면으로 내 일기를 본다.
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { fmt, fmtByKey } from '../../../core/dateFmt';
import { SeamSheet, showToast } from '../../../app/ui';
import { CharacterImage, EmotionEmojiRow, reactionAssetPath } from '../../../app/emoticons';
import { trafficGlow } from '../../../app/mood';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import type { ChildDiary, FamilyDiaryComment } from '../models';
import { splitKeywords } from '../models';

/** 서버 REACTION_EMOJIS와 1:1 — 학생앱 공감 3종 시스템 (REVIEW §11-1). */
const REACTION_EMOJIS = ['love', 'sad', 'angry'] as const;

/** 추천 문구 칩 (시안 B-5) — 부모의 댓글 진입장벽을 낮추는 큐레이션 문구 키. */
const COMMENT_CHIP_KEYS = ['diary.chip1', 'diary.chip2', 'diary.chip3'];

export function DiaryDetailScreen() {
  const { membershipId: midParam, diaryId: didParam } = useParams();
  const isOwn = midParam === undefined;
  const membershipId = midParam === undefined ? null : Number(midParam);
  const diaryId = Number(didParam);
  const familyId = useFamilyId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();

  // 닉네임: 라우트 state → 홈 캐시의 멤버 목록 → 폴백 (Flutter router extra와 동일 서열)
  const stateNickname = (location.state as { nickname?: string } | null)?.nickname;
  const cachedHome = queryClient.getQueryData<{ members?: { membershipId: number; nickname: string }[] }>([
    'home',
    familyId,
  ]);
  const nickname = isOwn
    ? tr('diary.me')
    : (stateNickname ??
      cachedHome?.members?.find((m) => m.membershipId === membershipId)?.nickname ??
      tr('nav.childFallback'));

  const diaryKey = ['diaryDetail', isOwn ? 'me' : membershipId, diaryId];
  const diaryQuery = useQuery({
    queryKey: diaryKey,
    queryFn: () =>
      isOwn
        ? repo.myDiaryDetail(diaryId)
        : repo.childDiaryDetail(familyId, membershipId!, diaryId),
    retry: false,
  });

  // 댓글 로드 실패는 본문 표시를 막지 않는다 (Flutter와 동일 — 빈 목록 폴백)
  const commentsQuery = useQuery({
    queryKey: ['diaryComments', diaryId],
    queryFn: () => repo.comments(diaryId).catch(() => [] as FamilyDiaryComment[]),
    enabled: diaryQuery.isSuccess,
  });

  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyDiaryComment | null>(null);
  const [deleting, setDeleting] = useState<FamilyDiaryComment | null>(null);

  const invalidateFeedSide = () => {
    // 홈 피드 카드의 공감·댓글 수 동기화 (상세를 다녀오면 홈이 최신이어야 한다)
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
  };

  const toggleReaction = async (emoji: string) => {
    if (toggling) return;
    setToggling(true);
    try {
      const summary = await repo.toggleReaction(diaryId, emoji);
      queryClient.setQueryData<ChildDiary>(diaryKey, (d) =>
        d
          ? {
              ...d,
              reactions: Object.fromEntries(
                Object.entries((summary.reactions as Record<string, unknown>) ?? {}).map(
                  ([k, v]) => [k, Number(v)],
                ),
              ),
              myReaction: (summary.my_reaction as string | null) ?? null,
              commentCount: (summary.comment_count as number | undefined) ?? d.commentCount,
            }
          : d,
      );
      invalidateFeedSide();
    } catch (e) {
      showToast(tr('diary.reactionFailed', { error: (e as Error).message }));
    } finally {
      setToggling(false);
    }
  };

  const sendComment = async () => {
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await repo.addComment(diaryId, text);
      setCommentText('');
      await queryClient.invalidateQueries({ queryKey: ['diaryComments', diaryId] });
      invalidateFeedSide();
    } catch (e) {
      showToast(tr('diary.commentFailed', { error: (e as Error).message }));
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async (text: string) => {
    if (!editing) return;
    try {
      await repo.updateComment(diaryId, editing.id, text);
      await queryClient.invalidateQueries({ queryKey: ['diaryComments', diaryId] });
    } catch (e) {
      showToast((e as Error).message);
    }
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await repo.deleteComment(diaryId, deleting.id);
      await queryClient.invalidateQueries({ queryKey: ['diaryComments', diaryId] });
      invalidateFeedSide();
    } catch (e) {
      showToast((e as Error).message);
    }
    setDeleting(null);
  };

  const diary = diaryQuery.data;

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
        <h3 style={{ margin: 0, fontSize: 16 }}>{tr('diary.title', { name: nickname })}</h3>
      </header>

      {diaryQuery.isError ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
          <p style={{ color: 'var(--seam-error)', fontSize: 14, textAlign: 'center' }}>
            {(diaryQuery.error as Error).message}
          </p>
        </div>
      ) : !diary ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <span className="seam-spinner" />
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
            <DiaryBody diary={diary} nickname={nickname} isOwn={isOwn} />
            {(diary.seamTalk ?? '').trim() !== '' && (
              <div style={{ marginTop: 14 }}>
                <SeamTalkBubble text={diary.seamTalk!.trim()} />
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <ReactionBar
                diary={diary}
                busy={toggling}
                onTap={toggleReaction}
                onShowWho={() => setWhoOpen(true)}
              />
            </div>
            <div style={{ marginTop: 18 }}>
              <CommentList
                comments={commentsQuery.data}
                nickname={nickname}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </div>
          </div>

          {/* 추천 문구 칩 (시안 B-5) — 탭하면 입력창에 채워진다 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              padding: '6px 12px',
              flexShrink: 0,
            }}
          >
            {COMMENT_CHIP_KEYS.map((key) => (
              <button
                key={key}
                id={`comment_chip_${key}`}
                onClick={() => setCommentText(tr(key))}
                style={{
                  flexShrink: 0,
                  fontSize: 12.5,
                  padding: '7px 12px',
                  borderRadius: 'var(--seam-radius-full)',
                  background: 'var(--seam-brand-tint-bg)',
                  border: '1px solid var(--seam-border-subtle)',
                  cursor: 'pointer',
                  color: 'var(--seam-text-primary)',
                }}
              >
                {tr(key)}
              </button>
            ))}
          </div>

          {/* 하단 고정 댓글 입력 바 */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              padding: '8px 12px',
              borderTop: '0.8px solid var(--seam-border-subtle)',
              background: 'var(--seam-surface-base)',
              flexShrink: 0,
            }}
          >
            <textarea
              id="detail_comment_input"
              className="seam-input"
              rows={1}
              maxLength={300}
              value={commentText}
              placeholder={tr('diary.commentHint', { name: nickname })}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendComment();
                }
              }}
              style={{ flex: 1, resize: 'none', fontSize: 13.5, padding: '10px 14px' }}
            />
            <button
              id="detail_comment_send"
              onClick={() => void sendComment()}
              disabled={sending}
              aria-label="send"
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                border: 'none',
                borderRadius: 'var(--seam-radius-md)',
                background: 'var(--seam-brand)',
                color: '#fff',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 17,
              }}
            >
              {sending ? <span className="seam-spinner" /> : '➤'}
            </button>
          </div>
        </>
      )}

      <WhoReactedSheet diaryId={diaryId} open={whoOpen} onClose={() => setWhoOpen(false)} />
      <CommentEditSheet
        comment={editing}
        onClose={() => setEditing(null)}
        onSave={(text) => void saveEdit(text)}
      />
      <SeamSheet open={deleting !== null} onClose={() => setDeleting(null)}>
        <h3 style={{ margin: '4px 0 10px', fontSize: 17 }}>{tr('diary.commentDelete')}</h3>
        <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--seam-text-secondary)' }}>
          {tr('diary.commentDeleteConfirm')}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="seam-btn seam-btn--ghost" onClick={() => setDeleting(null)}>
            {tr('common.cancel')}
          </button>
          <button
            id="comment_delete_confirm"
            className="seam-btn"
            style={{ background: 'var(--seam-brand-secondary)' }}
            onClick={() => void confirmDelete()}
          >
            {tr('common.delete')}
          </button>
        </div>
      </SeamSheet>
    </div>
  );
}

/** 본문 카드 — 날짜·제목·감정·공개범위, full이면 본문/키워드, summary면 요약+안내.
 *  본인 글(isOwn)은 공개범위와 무관하게 항상 전문 + 안내 배너 없음. */
function DiaryBody({
  diary,
  nickname,
  isOwn,
}: {
  diary: ChildDiary;
  nickname: string;
  isOwn: boolean;
}) {
  const when = diary.date ? fmtByKey(diary.date, 'diary.dateFmtFull') : '';
  const keywords = splitKeywords(diary.keywords);
  const isFull = diary.visibility === 'full';
  return (
    <div
      style={{
        background: 'var(--seam-surface-base)',
        borderRadius: 'var(--seam-radius-lg)',
        border: '1px solid var(--seam-card-border)',
        boxShadow: trafficGlow(diary.emotionsScore),
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)' }}>{when}</p>
          <h2 style={{ margin: '4px 0 0', fontSize: 19 }}>
            {diary.title === '' ? tr('diary.untitled') : diary.title}
          </h2>
        </div>
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
      </div>
      <div style={{ marginTop: 12 }}>
        <EmotionEmojiRow emotions={diary.emotions} size={36} />
      </div>
      <hr
        style={{
          border: 'none',
          borderTop: '0.8px solid var(--seam-border-subtle)',
          margin: '12px 0 14px',
        }}
      />
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
        {(isOwn || isFull ? diary.content : diary.summary) ?? ''}
      </p>
      {!isOwn && !isFull && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 'var(--seam-radius-md)',
            background: 'var(--seam-brand-tint-bg)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <CharacterImage mood="chat" size={40} />
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--seam-text-secondary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {tr('diary.summaryNotice', { name: nickname })}
          </p>
        </div>
      )}
      {keywords.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {keywords.map((k) => (
            <span
              key={k}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--seam-radius-full)',
                background: 'var(--seam-surface-sunken)',
                fontSize: 12,
                color: 'var(--seam-text-secondary)',
              }}
            >
              #{k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** SeamTalk(AI 위로 코멘트) 말풍선 — 학생앱 상세의 심스 코멘트 자리. */
function SeamTalkBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <CharacterImage mood="chat" size={44} />
      <div
        style={{
          flex: 1,
          padding: 14,
          background: 'var(--seam-brand-tint-bg)',
          borderRadius:
            '0 var(--seam-radius-lg) var(--seam-radius-lg) var(--seam-radius-lg)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--seam-brand-point)',
          }}
        >
          {tr('diary.seamTalkTitle')}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/** 공감 바 — 3종 단일선택 토글. 내 선택 외 이모지는 30% 흐리게(학생앱 reaction_popup 문법),
 *  공감이 있으면 우측 '누가 공감했나' 버튼. */
function ReactionBar({
  diary,
  busy,
  onTap,
  onShowWho,
}: {
  diary: ChildDiary;
  busy: boolean;
  onTap: (emoji: string) => void;
  onShowWho: () => void;
}) {
  const total = Object.values(diary.reactions).reduce((sum, n) => sum + n, 0);
  return (
    <div
      className="seam-card"
      style={{ display: 'flex', alignItems: 'center', padding: '10px 12px' }}
    >
      <span style={{ fontSize: 13, fontWeight: 700 }}>{tr('diary.reactions')}</span>
      <div style={{ flex: 1, display: 'flex', marginLeft: 10 }}>
        {REACTION_EMOJIS.map((emoji) => {
          const mine = diary.myReaction === emoji;
          const dimmed = diary.myReaction !== null && !mine;
          return (
            <button
              key={emoji}
              id={`reaction_${emoji}`}
              disabled={busy}
              onClick={() => onTap(emoji)}
              style={{
                flex: 1,
                margin: '0 2px',
                padding: '6px 0',
                borderRadius: 'var(--seam-radius-md)',
                border: `1px solid ${mine ? 'var(--seam-brand)' : 'transparent'}`,
                background: mine ? 'var(--seam-brand-tint-bg)' : 'transparent',
                cursor: 'pointer',
                opacity: dimmed ? 0.3 : 1,
              }}
            >
              <img src={reactionAssetPath(emoji)} width={28} height={28} alt={emoji} />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: mine ? 700 : 400,
                  color: mine ? 'var(--seam-brand-point)' : 'var(--seam-text-secondary)',
                }}
              >
                {diary.reactions[emoji] ?? 0}
              </div>
            </button>
          );
        })}
      </div>
      {total > 0 && (
        <button
          id="reaction_who_btn"
          title={tr('diary.reactionWho')}
          onClick={onShowWho}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--seam-text-secondary)',
            padding: '4px 6px',
          }}
        >
          👥
        </button>
      )}
    </div>
  );
}

/** '누가 공감했나' 바텀시트 — 학생앱 reaction_popup 상세의 가족판. */
function WhoReactedSheet({
  diaryId,
  open,
  onClose,
}: {
  diaryId: number;
  open: boolean;
  onClose: () => void;
}) {
  const listQuery = useQuery({
    queryKey: ['reactionList', diaryId],
    queryFn: () => repo.reactionList(diaryId),
    enabled: open,
    staleTime: 0,
  });
  const items = ((listQuery.data?.items as Record<string, unknown>[]) ?? []) as {
    emoji: string;
    nickname: string;
    is_mine?: boolean;
  }[];
  return (
    <SeamSheet open={open} onClose={onClose}>
      <h3 style={{ margin: '4px 0 12px', fontSize: 16 }}>{tr('diary.reactionWho')}</h3>
      {listQuery.isLoading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
          <span className="seam-spinner" />
        </div>
      ) : items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)' }}>
          {tr('diary.reactionNone')}
        </p>
      ) : (
        items.map((item, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
          >
            <img src={reactionAssetPath(item.emoji)} width={24} height={24} alt={item.emoji} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{item.nickname}</span>
            {item.is_mine === true && (
              <span style={{ fontSize: 11.5, color: 'var(--seam-brand-point)' }}>
                {tr('diary.reactionMe')}
              </span>
            )}
          </div>
        ))
      )}
    </SeamSheet>
  );
}

/** 댓글 목록 — 공유이야기 상세처럼 본문 아래 인라인. */
function CommentList({
  comments,
  nickname,
  onEdit,
  onDelete,
}: {
  comments: FamilyDiaryComment[] | undefined;
  nickname: string;
  onEdit: (c: FamilyDiaryComment) => void;
  onDelete: (c: FamilyDiaryComment) => void;
}) {
  const [menuFor, setMenuFor] = useState<number | null>(null);
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>
        {tr('diary.commentsCount', { n: `${comments?.length ?? ''}` })}
      </p>
      {comments === undefined ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
          <span className="seam-spinner" />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ margin: '12px 0', fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
          {tr('diary.noComments', { name: nickname })}
        </p>
      ) : (
        comments.map((c) => (
          <div
            key={c.id}
            style={{
              marginBottom: 10,
              padding: 12,
              borderRadius: 'var(--seam-radius-md)',
              background: c.isMine ? 'var(--seam-brand-tint-bg)' : 'var(--seam-surface-elevated)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.nickname}</span>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--seam-text-disabled)' }}>
                {fmt(c.createdAt, 'M/d HH:mm')}
              </span>
              {/* 3-dot — 본인 댓글만 (학생앱 role 분기의 family판, REVIEW §11-2) */}
              {c.isMine && (
                <button
                  id={`comment_more_${c.id}`}
                  onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 15,
                    lineHeight: 1,
                    padding: '2px 4px',
                    color: 'var(--seam-text-secondary)',
                  }}
                >
                  ⋮
                </button>
              )}
            </div>
            {menuFor === c.id && (
              <div
                style={{
                  position: 'absolute',
                  top: 32,
                  right: 8,
                  background: 'var(--seam-surface-base)',
                  border: '1px solid var(--seam-border-subtle)',
                  borderRadius: 'var(--seam-radius-sm)',
                  boxShadow: 'var(--seam-shadow-low)',
                  zIndex: 10,
                  overflow: 'hidden',
                }}
              >
                <button
                  id={`comment_edit_${c.id}`}
                  onClick={() => {
                    setMenuFor(null);
                    onEdit(c);
                  }}
                  style={menuItemStyle}
                >
                  {tr('diary.commentEdit')}
                </button>
                <button
                  id={`comment_delete_${c.id}`}
                  onClick={() => {
                    setMenuFor(null);
                    onDelete(c);
                  }}
                  style={{ ...menuItemStyle, color: 'var(--seam-brand-secondary)' }}
                >
                  {tr('diary.commentDelete')}
                </button>
              </div>
            )}
            <p style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {c.text}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

const menuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  minWidth: 96,
  textAlign: 'left',
  border: 'none',
  background: 'none',
  padding: '9px 14px',
  fontSize: 13.5,
  cursor: 'pointer',
  color: 'var(--seam-text-primary)',
};

/** 댓글 수정 시트 — Flutter AlertDialog의 웹판(SeamSheet + textarea). */
function CommentEditSheet({
  comment,
  onClose,
  onSave,
}: {
  comment: FamilyDiaryComment | null;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [forId, setForId] = useState<number | null>(null);
  // 대상 댓글이 바뀌면 원문으로 초기화
  if (comment && comment.id !== forId) {
    setForId(comment.id);
    setText(comment.text);
  }
  return (
    <SeamSheet open={comment !== null} onClose={onClose}>
      <h3 style={{ margin: '4px 0 12px', fontSize: 17 }}>{tr('diary.commentEdit')}</h3>
      <textarea
        id="comment_edit_input"
        className="seam-input"
        rows={3}
        maxLength={300}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', resize: 'none', fontSize: 14 }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="seam-btn seam-btn--ghost" onClick={onClose}>
          {tr('common.cancel')}
        </button>
        <button
          id="comment_edit_save"
          className="seam-btn"
          onClick={() => {
            const t = text.trim();
            if (!comment || t === '' || t === comment.text) {
              onClose();
              return;
            }
            onSave(t);
          }}
        >
          {tr('common.save')}
        </button>
      </div>
    </SeamSheet>
  );
}
