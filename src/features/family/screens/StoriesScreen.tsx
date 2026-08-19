// 이야기 탭 = 가족 공유이야기 (docs/14 §4-3 확정안).
// 가족당 공유이야기 1개 고정 — 방 목록·생성·초대코드·승인 UI 없음, 탭 진입 즉시 가족 피드.
// 재사용 범위는 공유이야기 방 '내부' 문법(피드 카드·상세·공감·댓글) = FeedCard 그대로.
// 데이터 소스는 families/{id}/feed/ (공개범위 마스킹·반응 요약 서버 적용).
import { useState } from 'react';
import { tr } from '../../../core/i18n/i18n';
import { WriteDiarySheet } from '../widgets/WriteDiarySheet';
import { useFamily, useFamilyId } from '../FamilyContext';
import { useFeed } from '../../dashboard/hooks';
import { FeedCard, periods } from '../../dashboard/sections';

export function StoriesScreen() {
  const familyId = useFamilyId();
  const { currentFamily } = useFamily();
  const [period, setPeriod] = useState('month');
  const [writeOpen, setWriteOpen] = useState(false);
  const feed = useFeed(familyId, period);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 0' }}>
        <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>
          {tr('nav.stories')}
          {currentFamily && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--seam-text-secondary)',
              }}
            >
              {currentFamily.familyName}
            </span>
          )}
        </h2>
        <select
          className="seam-input"
          style={{
            width: 'auto',
            padding: '6px 10px',
            fontSize: 12.5,
            borderRadius: 'var(--seam-radius-full)',
          }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {tr(p.labelKey)}
            </option>
          ))}
        </select>
      </header>
      {/* 프라이버시 안내 — 자녀의 공개범위 선택 존중 (공개범위 서버 강제와 쌍) */}
      <p style={{ margin: '6px 20px 0', fontSize: 11.5, color: 'var(--seam-text-disabled)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {tr('story.privacyNote')}
      </p>

      <div style={{ flex: 1, padding: '12px 20px 24px' }}>
        {feed.isError ? (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <p style={{ fontSize: 13, color: 'var(--seam-error)' }}>
              {(feed.error as Error).message}
            </p>
            <button
              className="seam-btn"
              style={{ maxWidth: 160, margin: '12px auto 0' }}
              onClick={() => void feed.refetch()}
            >
              {tr('common.retry')}
            </button>
          </div>
        ) : feed.isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', paddingTop: 48 }}>
            <span className="seam-spinner" />
          </div>
        ) : (feed.data?.length ?? 0) === 0 ? (
          <p
            style={{
              margin: 0,
              paddingTop: 32,
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--seam-text-secondary)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {tr('story.emptyList')}
          </p>
        ) : (
          feed.data!.map((item, i) => (
            <FeedCard key={item.diaryId ?? `c${i}`} item={item} familyId={familyId} />
          ))
        )}
      </div>

      {/* 이야기 나누기 — 부모 글도 같은 피드에 실린다 (작성 = 내 일기) */}
      <button
        id="stories_write_fab"
        title={tr('home.myRecordTitle')}
        onClick={() => setWriteOpen(true)}
        style={{
          position: 'fixed',
          bottom: 84,
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
      <WriteDiarySheet open={writeOpen} onClose={() => setWriteOpen(false)} />
    </div>
  );
}
