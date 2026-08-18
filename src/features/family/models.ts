// family API 응답 모델 — mDiary_backend family/의 serializer·view 응답과 1:1.
// Flutter family_models.dart 이식(톡방 모델 제외). 서버 키 흡수는 여기서만 한다.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

export interface FamilyMemberInfo {
  membershipId: number;
  userId: number;
  role: 'parent' | 'child' | '';
  nickname: string;
  username: string;
  isAccepted: boolean;
}

export function parseFamilyMemberInfo(json: Json): FamilyMemberInfo {
  return {
    membershipId: json.id,
    userId: json.user,
    role: json.role ?? '',
    nickname: json.nickname ?? '',
    username: json.username ?? '',
    isAccepted: json.is_accepted ?? false,
  };
}

export interface MyFamilyEntry {
  familyId: number;
  familyName: string;
  myRole: string;
  isAccepted: boolean;
  membershipId: number | null;
  myNickname: string;
  myUsername: string;
  /** 승인된 구성원 전체 (나 포함) */
  members: FamilyMemberInfo[];
}

export function parseMyFamilyEntry(json: Json): MyFamilyEntry {
  const family: Json = json.family;
  const membershipId: number | null = json.membership_id ?? null;
  const members = ((family.members as Json[]) ?? [])
    .map(parseFamilyMemberInfo)
    .filter((m) => m.isAccepted);
  const me = members.find((m) => m.membershipId === membershipId);
  return {
    familyId: family.id,
    familyName: family.name,
    myRole: json.my_role,
    isAccepted: json.is_accepted,
    membershipId,
    myNickname: me?.nickname ?? '',
    myUsername: me?.username ?? '',
    members,
  };
}

/** 서버 keywords("발표,학교" 또는 공백 구분)를 태그 리스트로. */
export function splitKeywords(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(/[,\s]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

export interface ChildCard {
  membershipId: number;
  nickname: string;
  /** 최신 기록이 비밀일기 — 자물쇠 표시 */
  isSecret: boolean;
  profileUrl: string | null;
  latestDiaryId: number | null;
  latestEmotions: string | null;
  latestScore: number | null;
  latestDate: Date | null;
  recordedToday: boolean;
  starter: string | null;
  keywords: string[];
  recentEmotions: string[];
}

export function parseChildCard(json: Json): ChildCard {
  const latest: Json | null = json.latest_diary ?? null;
  return {
    membershipId: json.membership_id,
    nickname: json.nickname,
    latestDiaryId: latest?.id ?? null,
    latestEmotions: latest?.emotions ?? null,
    latestScore: latest?.emotions_score ?? null,
    latestDate: latest ? new Date(latest.date) : null,
    recordedToday: json.recorded_today ?? false,
    starter: json.starter ?? null,
    keywords: splitKeywords(latest?.keywords),
    isSecret: latest?.is_secret ?? false,
    profileUrl: json.profile_url ?? null,
    recentEmotions: ((json.recent_emotions as any[]) ?? []).map(String),
  };
}

export interface PendingMember {
  membershipId: number;
  nickname: string;
  role: string;
}

export interface FamilyHome {
  familyName: string;
  children: ChildCard[];
  pending: PendingMember[];
  recordedToday: number;
  unreadNotifications: number;
}

export function parseFamilyHome(json: Json): FamilyHome {
  return {
    familyName: json.family_name,
    children: (json.children as Json[]).map(parseChildCard),
    pending: ((json.pending_members as Json[]) ?? []).map((e) => ({
      membershipId: e.membership_id,
      nickname: e.nickname,
      role: e.role,
    })),
    recordedToday: json.summary?.recorded_today ?? 0,
    unreadNotifications: json.unread_notifications ?? 0,
  };
}

export interface MonthlyReportData {
  year: number;
  month: number;
  childNickname: string;
  daysRecorded: number;
  topEmotion: string | null;
  avgMood: number | null;
  /** 1일~말일, 기록 없는 날은 null */
  moodByDay: (number | null)[];
  seamsSummary: string;
}

export function parseMonthlyReport(json: Json): MonthlyReportData {
  return {
    year: json.year,
    month: json.month,
    childNickname: json.child?.nickname ?? '',
    daysRecorded: json.days_recorded ?? 0,
    topEmotion: json.top_emotion ?? null,
    avgMood: json.avg_mood ?? null,
    moodByDay: ((json.mood_by_day as Json[]) ?? []).map((e) => e.score ?? null),
    seamsSummary: json.seams_summary ?? '',
  };
}

export type NotificationType =
  | 'risk_signal'
  | 'mood_low'
  | 'monthly_report'
  | 'streak'
  | 'schedule'
  | 'comment'
  | 'reaction';

export interface FamilyNotificationItem {
  id: number;
  notifType: NotificationType;
  title: string;
  body: string;
  payload: Json;
  feedback: 'helpful' | 'not_really' | null;
  createdAt: Date;
  readAt: Date | null;
}

export function parseNotification(json: Json): FamilyNotificationItem {
  return {
    id: json.id,
    notifType: json.notif_type,
    title: json.title ?? '',
    body: json.body ?? '',
    payload: json.payload ?? {},
    feedback: json.feedback ?? null,
    createdAt: new Date(json.created_at),
    readAt: json.read_at ? new Date(json.read_at) : null,
  };
}

export const notificationHelpers = {
  isUnread: (n: FamilyNotificationItem) => n.readAt === null,
  childMembershipId: (n: FamilyNotificationItem): number | null =>
    n.payload.child_membership_id ?? null,
  diaryId: (n: FamilyNotificationItem): number | null => n.payload.diary_id ?? null,
  isSecretDiary: (n: FamilyNotificationItem): boolean => n.payload.is_secret ?? false,
  /** 댓글·공감 알림은 내 이야기 라우트로 열어야 한다. */
  isOwnDiary: (n: FamilyNotificationItem): boolean => n.payload.own_diary ?? false,
};

/** 공개범위 마스킹 반영: content는 full일 때만, summary는 summary일 때만 온다. */
export interface ChildDiary {
  id: number;
  title: string;
  visibility: 'full' | 'summary';
  content: string | null;
  summary: string | null;
  imageUrl: string | null;
  emotions: string | null;
  emotionsScore: number | null;
  /** LBTI */
  mbti: string | null;
  seamTalk: string | null;
  /** 콤마 구분 (full 공개만) */
  keywords: string | null;
  iStress: number | null;
  iAnxiety: number | null;
  iDepress: number | null;
  iConfidence: number | null;
  reactions: Record<string, number>;
  myReaction: string | null;
  commentCount: number;
  date: Date | null;
}

export function parseChildDiary(json: Json): ChildDiary {
  return {
    id: json.id,
    title: json.title ?? '',
    visibility: json.family_visibility,
    content: json.content ?? null,
    summary: json.summary ?? null,
    imageUrl: json.image_url ?? null,
    emotions: json.emotions ?? null,
    emotionsScore: json.emotions_score ?? null,
    mbti: json.mbti ?? null,
    seamTalk: json.SeamTalk ?? null,
    keywords: json.keywords ?? null,
    iStress: json.iStress ?? null,
    iAnxiety: json.iAnxiety ?? null,
    iDepress: json.iDepress ?? null,
    iConfidence: json.iConfidence ?? null,
    reactions: json.reactions ?? {},
    myReaction: json.my_reaction ?? null,
    commentCount: json.comment_count ?? 0,
    date: json.date ? new Date(json.date) : null,
  };
}

export const isFullDiary = (d: ChildDiary) => d.visibility === 'full';

export interface ChildCheckin {
  emotion: string | null;
  score: number | null;
  descript: string | null;
  date: Date | null;
}

export function parseChildCheckin(json: Json): ChildCheckin {
  return {
    emotion: json.emotion ?? null,
    score: json.score ?? null,
    descript: json.descript ?? null,
    date: json.date ? new Date(json.date) : null,
  };
}

/** 월 모드 데이터 묶음 — 감정 달력·리포트의 원천 */
export interface MonthlyChildData {
  diaries: ChildDiary[];
  checkins: ChildCheckin[];
}

export interface ChildAccount {
  membershipId: number;
  username: string;
  name: string;
  nickname: string;
  birthDate: Date | null;
  gender: 'male' | 'female' | '';
  /** 학생앱 행성 레벨 (시안 C-3 Lv.N) */
  level: number | null;
}

export function parseChildAccount(json: Json): ChildAccount {
  return {
    membershipId: json.membership_id,
    username: json.username,
    name: json.name ?? '',
    nickname: json.nickname ?? '',
    birthDate: json.birth_date ? new Date(json.birth_date) : null,
    gender: json.gender ?? '',
    level: json.level ?? null,
  };
}

/** 가족 피드 아이템 — /family/families/{id}/feed/ (일기 또는 체크인). */
export interface FeedItem {
  type: 'diary' | 'checkin';
  authorNickname: string;
  authorRole: 'parent' | 'child';
  authorMembershipId: number;
  date: Date | null;
  diaryId: number | null;
  title: string | null;
  /** full이면 본문, summary면 요약 */
  body: string | null;
  isFull: boolean;
  emotions: string | null;
  emotionsScore: number | null;
  keywords: string[];
  checkinEmotion: string | null;
  checkinDescript: string | null;
  reactions: Record<string, number>;
  myReaction: string | null;
  commentCount: number;
}

export function parseFeedItem(json: Json): FeedItem {
  const author: Json = json.author;
  const diary: Json | null = json.diary ?? null;
  const checkin: Json | null = json.checkin ?? null;
  return {
    type: json.type,
    authorNickname: author.nickname,
    authorRole: author.role,
    authorMembershipId: author.membership_id,
    date: json.date ? new Date(json.date) : null,
    diaryId: diary?.id ?? null,
    title: diary?.title ?? null,
    body: diary?.content ?? diary?.summary ?? null,
    isFull: diary?.family_visibility === 'full' || diary?.content != null,
    emotions: diary?.emotions ?? null,
    emotionsScore: diary?.emotions_score ?? null,
    keywords: splitKeywords(diary?.keywords),
    checkinEmotion: checkin?.emotion ?? null,
    checkinDescript: checkin?.descript ?? null,
    reactions: Object.fromEntries(
      Object.entries((json.reactions as Json) ?? {}).map(([k, v]) => [k, Number(v)]),
    ),
    myReaction: json.my_reaction ?? null,
    commentCount: json.comment_count ?? 0,
  };
}

export interface FamilyDiaryComment {
  id: number;
  text: string;
  nickname: string;
  isMine: boolean;
  createdAt: Date;
}

export function parseComment(json: Json): FamilyDiaryComment {
  return {
    id: json.id,
    text: json.text,
    nickname: json.nickname ?? '?',
    isMine: json.is_mine ?? false,
    createdAt: new Date(json.created_at),
  };
}

export interface FamilyEvent {
  id: number;
  title: string;
  date: Date;
  isLunar: boolean;
  repeatYearly: boolean;
  emoji: string;
}

export function parseFamilyEvent(json: Json): FamilyEvent {
  return {
    id: json.id,
    title: json.title,
    date: new Date(json.date),
    isLunar: json.is_lunar ?? false,
    repeatYearly: json.repeat_yearly ?? false,
    emoji: json.emoji ?? '',
  };
}

/** 이번 연도 기준 D-day (매년 반복 고려) */
export function eventDday(ev: FamilyEvent, today: Date): number {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let target = new Date(today.getFullYear(), ev.date.getMonth(), ev.date.getDate());
  if (ev.repeatYearly && target < startOfDay(today)) {
    target = new Date(today.getFullYear() + 1, ev.date.getMonth(), ev.date.getDate());
  }
  return Math.round((target.getTime() - startOfDay(today).getTime()) / 86_400_000);
}

export interface FamilyMessage {
  id: number;
  text: string;
  emotion: string;
  senderNickname: string;
  receiverNickname: string;
  createdAt: Date;
  readAt: Date | null;
}

export function parseFamilyMessage(json: Json): FamilyMessage {
  return {
    id: json.id,
    text: json.text,
    emotion: json.emotion ?? '',
    senderNickname: json.sender?.nickname ?? '?',
    receiverNickname: json.receiver?.nickname ?? '?',
    createdAt: new Date(json.created_at),
    readAt: json.read_at ? new Date(json.read_at) : null,
  };
}
