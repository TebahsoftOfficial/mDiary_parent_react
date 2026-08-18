// 엔드포인트 상수 — 백엔드와 1:1 (Flutter api_paths.dart 이식 + 하드코딩이던 경로 전부 상수화).
// 가족톡방(rooms) 7종은 폐지 결정으로 이식하지 않음 (docs/14 §2).
export const baseUrl: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export const apiPaths = {
  // 인증 (mDiary_app — 웹 로그인은 get_jwt_token, 학생앱 쿠키 로그인과 다름)
  login: '/mDiary_app/get_jwt_token/',
  refresh: '/mDiary_app/refresh_token/',
  downloadFont: (fileName: string) =>
    `/mDiary_app/download_font/?file_name=${encodeURIComponent(fileName)}&locale=ko-kr`,

  // 계정 축
  signup: '/family/signup/',
  spouseSignup: '/family/spouse-signup/',
  passwordResetRequest: '/family/password-reset/request/',
  passwordResetConfirm: '/family/password-reset/confirm/',
  usernameCheck: (username: string) =>
    `/family/username-check/?username=${encodeURIComponent(username)}`,

  // 가족
  myFamilies: '/family/mine/',
  createFamily: '/family/families/',
  joinFamily: '/family/join/',
  familyDetail: (fid: number) => `/family/families/${fid}/`,
  accept: (fid: number, mid: number) => `/family/families/${fid}/members/${mid}/accept/`,
  spouseInvite: (fid: number) => `/family/families/${fid}/spouse-invite/`,
  home: (fid: number) => `/family/families/${fid}/home/`,
  option: (fid: number) => `/family/families/${fid}/option/`,
  feed: (fid: number, limit = 20) => `/family/families/${fid}/feed/?limit=${limit}`,

  // 자녀 계정
  children: (fid: number) => `/family/families/${fid}/children/`,
  childPassword: (fid: number, mid: number) =>
    `/family/families/${fid}/children/${mid}/password/`,
  childManage: (fid: number, mid: number) =>
    `/family/families/${fid}/children/${mid}/manage/`,
  childProfile: (fid: number, mid: number) =>
    `/family/families/${fid}/children/${mid}/profile/`,

  // 일기
  myDiaries: '/family/my-diaries/',
  myDiaryDetail: (did: number) => `/family/my-diaries/${did}/`,
  childDiaries: (fid: number, mid: number) =>
    `/family/families/${fid}/children/${mid}/diaries/`,
  childDiaryDetail: (fid: number, mid: number, did: number) =>
    `/family/families/${fid}/children/${mid}/diaries/${did}/`,
  familyDiaryDetail: (did: number) => `/family/diaries/${did}/`,

  // 공감·댓글
  reactions: (did: number) => `/family/diaries/${did}/reactions/`,
  comments: (did: number) => `/family/diaries/${did}/comments/`,
  comment: (did: number, cid: number) => `/family/diaries/${did}/comments/${cid}/`,

  // 일정
  events: (fid: number) => `/family/families/${fid}/events/`,
  event: (fid: number, eid: number) => `/family/families/${fid}/events/${eid}/`,

  // 쪽지
  messages: (fid: number, box?: 'received' | 'sent') =>
    `/family/families/${fid}/messages/${box ? `?box=${box}` : ''}`,
  messageRead: (fid: number, mid: number) =>
    `/family/families/${fid}/messages/${mid}/read/`,

  // 우체통(알림)
  notifications: (fid: number) => `/family/families/${fid}/notifications/`,
  notificationRead: (fid: number, nid: number) =>
    `/family/families/${fid}/notifications/${nid}/read/`,
  notificationFeedback: (fid: number, nid: number) =>
    `/family/families/${fid}/notifications/${nid}/feedback/`,

  // 월간 보고서
  monthlyReport: (fid: number, mid: number, year: number, month: number) =>
    `/family/families/${fid}/children/${mid}/monthly-report/?year=${year}&month=${month}`,
} as const;
