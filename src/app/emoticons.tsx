// 감정 이모티콘 — 학생앱과 동일 자산·규칙 (Flutter emoticons.dart 이식).
// 자산: public/images/emoticons/basic/{engName}.png (46종). 미매칭은 soso 폴백.
/* eslint-disable react-refresh/only-export-components */
const koToEng: Record<string, string> = {
  감사: 'gratitude',
  감탄: 'admiration',
  걱정: 'worry',
  고독: 'solitude',
  그리움: 'miss',
  기쁨: 'joy',
  긴장: 'tension',
  너그러움: 'generosity',
  놀람: 'surprise',
  뉘우침: 'regret',
  당황: 'embarrassment',
  두려움: 'fear',
  따분: 'boredom',
  만족: 'satisfaction',
  난해: 'perplexity',
  미움: 'hatred',
  바람: 'longing',
  반감: 'antipathy',
  부끄러움: 'shame',
  불안: 'anxiety',
  사랑: 'love',
  질투: 'jealousy',
  소망: 'desire',
  소심: 'timidity',
  슬픔: 'sadness',
  신남: 'excitement',
  실망: 'disappointment',
  안심: 'relief',
  역겨움: 'disgust',
  열정: 'passion',
  외로움: 'loneliness',
  우울: 'depression',
  자랑: 'pride',
  좌절: 'frustration',
  즐거움: 'pleasure',
  짜증: 'annoyance',
  차분: 'calmness',
  측은: 'sympathy',
  포근: 'warmth',
  포기: 'surrender',
  피곤: 'fatigue',
  행복: 'happiness',
  화: 'anger',
  후회: 'remorse',
  희망: 'hope',
  보통: 'soso',
};

const engNames = new Set(Object.values(koToEng));

/** 체크인은 학생앱이 eng_name('Pride')으로 저장 — 소문자 매칭으로도 해석. */
export function emotionAssetPath(name: string): string {
  const trimmed = name.trim();
  const eng =
    koToEng[trimmed] ?? (engNames.has(trimmed.toLowerCase()) ? trimmed.toLowerCase() : 'soso');
  return `/images/emoticons/basic/${eng}.png`;
}

/** 공감 3종(love/sad/angry) — 서버 REACTION_EMOJIS와 1:1. */
export function reactionAssetPath(key: string): string {
  if (key === 'sad') return '/images/favorites/sad_icon.png';
  if (key === 'angry') return '/images/favorites/angry_icon.png';
  return '/images/favorites/smile_icon.png'; // love
}

/** 서버 emotions("즐거움" 또는 "즐거움,신남")을 이모티콘 나열로 — 32px, 간격 4. */
export function EmotionEmojiRow({ emotions, size = 32 }: { emotions?: string | null; size?: number }) {
  const names = (emotions ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (names.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 4, verticalAlign: 'middle' }}>
      {names.map((n, i) => (
        <img
          key={i}
          src={emotionAssetPath(n)}
          width={size}
          height={size}
          alt={n}
          style={{ objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      ))}
    </span>
  );
}

export type CharacterMood = 'basic' | 'hello' | 'cheer' | 'sad' | 'chat' | 'hug';

const moodAsset: Record<CharacterMood, string> = {
  basic: 'seams_default',
  hello: 'seams_hi',
  cheer: 'seams_cheer',
  sad: 'seams_cry',
  chat: 'seams_chat',
  hug: 'hug_open',
};

/** 마스코트 '심즈' — idle이면 상하 bob 애니메이션. */
export function CharacterImage({
  mood,
  size,
  idle = false,
}: {
  mood: CharacterMood;
  size: number;
  idle?: boolean;
}) {
  return (
    <img
      src={`/images/seams/${moodAsset[mood]}.png`}
      width={size}
      height={size}
      alt=""
      className={idle ? 'seam-bob' : undefined}
      style={{ objectFit: 'contain' }}
    />
  );
}
