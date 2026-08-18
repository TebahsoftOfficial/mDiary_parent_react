// family API 호출 계층 — Flutter family_repository.dart 이식 (톡방 11종 제외).
// 서버 응답 envelope(items/diaries 래핑)은 여기서만 흡수한다.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../../core/apiClient';
import { apiPaths } from '../../core/apiPaths';
import {
  parseChildAccount,
  parseChildCheckin,
  parseChildDiary,
  parseComment,
  parseFamilyEvent,
  parseFamilyHome,
  parseFamilyMessage,
  parseFeedItem,
  parseMonthlyReport,
  parseMyFamilyEntry,
  parseNotification,
} from './models';
import type {
  ChildAccount,
  ChildDiary,
  FamilyDiaryComment,
  FamilyEvent,
  FamilyHome,
  FamilyMessage,
  FamilyNotificationItem,
  FeedItem,
  MonthlyChildData,
  MonthlyReportData,
  MyFamilyEntry,
} from './models';

type Json = Record<string, any>;

function parseMonthlyChildData(data: Json): MonthlyChildData {
  return {
    diaries: (data.diaries as Json[]).map(parseChildDiary),
    checkins: ((data.checkins as Json[]) ?? []).map(parseChildCheckin),
  };
}

export const repo = {
  async mine(): Promise<MyFamilyEntry[]> {
    const data = await api.get<Json[]>(apiPaths.myFamilies);
    return data.map(parseMyFamilyEntry);
  },

  async createFamily(name: string, nickname = ''): Promise<number> {
    const data = await api.post<Json>(apiPaths.createFamily, { name, nickname });
    return data.id;
  },

  join(code: string, role = 'child', nickname = '') {
    return api.post(apiPaths.joinFamily, { code, role, nickname });
  },

  // ── v3 계정 축 (Add Child / 배우자 초대) ──

  async children(familyId: number): Promise<ChildAccount[]> {
    const data = await api.get<Json[]>(apiPaths.children(familyId));
    return data.map(parseChildAccount);
  },

  async addChild(
    familyId: number,
    input: {
      name: string;
      username: string;
      password: string;
      birthDate?: string; // 'YYYY-MM-DD'
      gender?: string;
      nickname?: string;
    },
  ): Promise<ChildAccount> {
    const body: Json = {
      name: input.name,
      username: input.username,
      password: input.password,
    };
    if (input.birthDate) body.birth_date = input.birthDate;
    if (input.gender) body.gender = input.gender;
    if (input.nickname) body.nickname = input.nickname;
    return parseChildAccount(await api.post<Json>(apiPaths.children(familyId), body));
  },

  resetChildPassword(familyId: number, membershipId: number, password: string) {
    return api.post(apiPaths.childPassword(familyId, membershipId), { password });
  },

  deleteChild(familyId: number, membershipId: number) {
    return api.delete(apiPaths.childManage(familyId, membershipId));
  },

  /** 배우자 초대 토큰 발급 — 링크/카톡 공유용. */
  async spouseInviteToken(familyId: number): Promise<string> {
    const data = await api.post<Json>(apiPaths.spouseInvite(familyId));
    return data.token;
  },

  async home(familyId: number): Promise<FamilyHome> {
    return parseFamilyHome(await api.get<Json>(apiPaths.home(familyId)));
  },

  /** 가족 피드 — 공개범위 마스킹은 서버가 강제. period: week | 2weeks | month */
  async feed(familyId: number, opts?: { limit?: number; period?: string }): Promise<FeedItem[]> {
    const path =
      apiPaths.feed(familyId, opts?.limit ?? 20) +
      (opts?.period ? `&period=${opts.period}` : '');
    const data = await api.get<Json>(path);
    return (data.items as Json[]).map(parseFeedItem);
  },

  /** 초대코드 포함 상세 — 관리자에게만 code가 응답된다. */
  async inviteCode(familyId: number): Promise<string | null> {
    const data = await api.get<Json>(apiPaths.familyDetail(familyId));
    return data.code ?? null;
  },

  accept(familyId: number, membershipId: number) {
    return api.post(apiPaths.accept(familyId, membershipId));
  },

  async childDiaries(familyId: number, membershipId: number): Promise<ChildDiary[]> {
    const data = await api.get<Json>(apiPaths.childDiaries(familyId, membershipId));
    return (data.diaries as Json[]).map(parseChildDiary);
  },

  /** 월 모드 — 감정 달력·리포트용 (해당 월 일기+체크인) */
  async childMonthly(
    familyId: number,
    membershipId: number,
    year: number,
    month: number,
  ): Promise<MonthlyChildData> {
    const data = await api.get<Json>(
      `${apiPaths.childDiaries(familyId, membershipId)}?year=${year}&month=${month}`,
    );
    return parseMonthlyChildData(data);
  },

  /** 내 월간 일기+체크인 — 본인 것이라 마스킹 없음 */
  async myMonthly(year: number, month: number): Promise<MonthlyChildData> {
    const data = await api.get<Json>(`${apiPaths.myDiaries}?year=${year}&month=${month}`);
    return parseMonthlyChildData(data);
  },

  /** 간소 일기 작성 (AI 분석 없음) — 톡방 폐지로 roomId 분기는 이식하지 않음. */
  writeMyDiary(input: {
    content: string;
    emotions: string;
    visibility?: 'full' | 'summary' | 'secret';
    title?: string;
  }) {
    const body: Json = {
      content: input.content,
      emotions: input.emotions,
      family_visibility: input.visibility ?? 'summary',
    };
    if (input.title) body.title = input.title;
    return api.post(apiPaths.myDiaries, body);
  },

  /** Add Child 아이디 중복 확인. */
  async usernameAvailable(username: string): Promise<boolean> {
    const data = await api.get<Json>(apiPaths.usernameCheck(username));
    return data.available ?? false;
  },

  getOption(familyId: number): Promise<Json> {
    return api.get<Json>(apiPaths.option(familyId));
  },

  putOption(familyId: number, changes: Json): Promise<Json> {
    return api.put<Json>(apiPaths.option(familyId), changes);
  },

  async childDiaryDetail(
    familyId: number,
    membershipId: number,
    diaryId: number,
  ): Promise<ChildDiary> {
    return parseChildDiary(
      await api.get<Json>(apiPaths.childDiaryDetail(familyId, membershipId, diaryId)),
    );
  },

  // ── 일정 / 쪽지 / 자녀 프로필 ──

  async events(familyId: number, year: number, month: number): Promise<FamilyEvent[]> {
    const data = await api.get<Json>(`${apiPaths.events(familyId)}?year=${year}&month=${month}`);
    return (data.items as Json[]).map(parseFamilyEvent);
  },

  addEvent(
    familyId: number,
    input: { title: string; date: string; isLunar?: boolean; repeatYearly?: boolean; emoji?: string },
  ) {
    return api.post(apiPaths.events(familyId), {
      title: input.title,
      date: input.date,
      is_lunar: input.isLunar ?? false,
      repeat_yearly: input.repeatYearly ?? false,
      emoji: input.emoji ?? '',
    });
  },

  deleteEvent(familyId: number, eventId: number) {
    return api.delete(apiPaths.event(familyId, eventId));
  },

  async messages(
    familyId: number,
    box: 'received' | 'sent' = 'received',
  ): Promise<{ items: FamilyMessage[]; unreadCount: number }> {
    const data = await api.get<Json>(apiPaths.messages(familyId, box));
    return {
      items: (data.items as Json[]).map(parseFamilyMessage),
      unreadCount: data.unread_count ?? 0,
    };
  },

  sendMessage(
    familyId: number,
    input: { receiverMembershipId: number; text: string; emotion?: string },
  ) {
    return api.post(apiPaths.messages(familyId), {
      receiver_membership_id: input.receiverMembershipId,
      text: input.text,
      emotion: input.emotion ?? '',
    });
  },

  markMessageRead(familyId: number, messageId: number) {
    return api.post(apiPaths.messageRead(familyId, messageId));
  },

  /** 본인 일기 단건 상세 — 자녀 일기 상세와 같은 화면을 본인 글에도. */
  async myDiaryDetail(diaryId: number): Promise<ChildDiary> {
    return parseChildDiary(await api.get<Json>(apiPaths.myDiaryDetail(diaryId)));
  },

  /** 월간 보고서 — 서버는 집계 JSON만, 렌더는 앱. */
  async monthlyReport(
    familyId: number,
    membershipId: number,
    year: number,
    month: number,
  ): Promise<MonthlyReportData> {
    return parseMonthlyReport(
      await api.get<Json>(apiPaths.monthlyReport(familyId, membershipId, year, month)),
    );
  },

  // ── 우체통 시스템 알림 ──

  async notifications(
    familyId: number,
  ): Promise<{ items: FamilyNotificationItem[]; unreadCount: number }> {
    const data = await api.get<Json>(apiPaths.notifications(familyId));
    return {
      items: (data.items as Json[]).map(parseNotification),
      unreadCount: data.unread_count ?? 0,
    };
  },

  markNotificationRead(familyId: number, notificationId: number) {
    return api.post(apiPaths.notificationRead(familyId, notificationId));
  },

  /** 코칭 알림 '도움이 됐나요?' — helpful | not_really */
  notificationFeedback(familyId: number, notificationId: number, feedback: string) {
    return api.post(apiPaths.notificationFeedback(familyId, notificationId), { feedback });
  },

  // ── 공감·댓글 ──

  /** 반응 토글 — 같은 이모지면 해제, 다르면 교체. 응답: {reactions, my_reaction, comment_count} */
  toggleReaction(diaryId: number, emoji: string): Promise<Json> {
    return api.post<Json>(apiPaths.reactions(diaryId), { emoji });
  },

  /** '누가 공감했나' — {items: [{nickname, emoji, is_mine, reacted_at}], reactions, my_reaction} */
  reactionList(diaryId: number): Promise<Json> {
    return api.get<Json>(apiPaths.reactions(diaryId));
  },

  async comments(diaryId: number): Promise<FamilyDiaryComment[]> {
    const data = await api.get<Json>(apiPaths.comments(diaryId));
    return (data.items as Json[]).map(parseComment);
  },

  addComment(diaryId: number, text: string) {
    return api.post(apiPaths.comments(diaryId), { text });
  },

  updateComment(diaryId: number, commentId: number, text: string) {
    return api.patch(apiPaths.comment(diaryId, commentId), { text });
  },

  deleteComment(diaryId: number, commentId: number) {
    return api.delete(apiPaths.comment(diaryId, commentId));
  },

  async updateChildProfile(
    familyId: number,
    membershipId: number,
    changes: Json,
  ): Promise<ChildAccount> {
    return parseChildAccount(
      await api.patch<Json>(apiPaths.childProfile(familyId, membershipId), changes),
    );
  },
};
