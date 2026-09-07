# mDiary_parent_react — Seamspace Family 부모 앱 (React 재구현)

기존 `../mDiary_parent`(Flutter)의 React(+TS) 재구현. **전환 결정·전수 인벤토리·진행 체크리스트의 정본은 `../docs/14-parent-react-migration.md`** — 화면 이식 전에 반드시 그 인벤토리와 Flutter 원본 소스를 스펙으로 삼을 것. Flutter 앱은 컷오버 전까지 스펙 겸 롤백 경로로 보존(수정 금지).

## 스택·빌드
- Vite + React 18 + TypeScript. 상태: TanStack Query(서버) + Context(인증·가족·설정). 라우팅 react-router v6. 차트 recharts, 날짜 date-fns, 캡처 html2canvas.
- API base는 **`.env.production`의 `VITE_API_BASE`** (현재 https://familyapi.seamspace.org, trailing slash 없이 — 경로 상수가 `/`로 시작).
- 빌드: `npm run build` (tsc -b + vite). 검증 루틴: `npx tsc --noEmit` 0 에러 → `npm run lint`(oxlint) 0 이슈 → 빌드 → demo-mom 스모크.
- **배포 = https://familyparent.seamspace.org** (08-19부터 — 기존 Flutter 도메인 재사용, CORS 기등록). nginx `family-seamspace.conf`의 familyparent 블록 root가 `dist/`를 가리킴(try_files SPA 폴백 있음). 배포는 `npm run build`만으로 반영(정적 파일). 롤백 = root를 `../mDiary_parent/build/web`으로 되돌리기.

## 구조 (Flutter 구조 미러)
- `src/app/` — tokens.css(**디자인 토큰 = CSS 변수, Flutter theme.dart 1:1** — 색 추가는 여기부터), router.tsx(가드 = go_router redirect 이식), Shell.tsx(하단 탭 4종 — 홈·이야기·리포트·마이페이지), ui.tsx(SeamSheet·토스트·버튼), emoticons.tsx(감정 46종 매핑+심즈), mood.ts(마음날씨·신호등)
- `src/core/` — apiPaths.ts(**엔드포인트 상수, 백엔드와 1:1** — 하드코딩 금지), apiClient.ts(JWT Bearer·15s 타임아웃·401 refresh 1회 재시도), tokenStore.ts(localStorage), i18n/(tr() + en/ko 377키 — Flutter 번들 기계 이식), dateFmt.ts(i18n 키가 포맷 문자열)
- `src/features/auth|dashboard|family/` — 화면·섹션·시트·models.ts(fromJson은 여기서만)·repository.ts
- `public/images/` — 학생앱과 동일 PNG 62종(이모티콘 46·심즈 6·공감 6·우체통·기본 프로필)

## 도메인 규칙 (Flutter CLAUDE.md 승계 — 깨면 안 됨)
- **공개범위는 서버가 강제**: full=전문, summary=요약·감정만, secret=존재 은닉(404). 받은 필드만 그린다 — 없는 필드를 다른 API로 우회 조회 금지.
- 공감은 서버 REACTION_EMOJIS 3종('love','sad','angry') 토글. 감정 식별자(한글)는 서버 값 — 번역 금지, 표시 라벨만 i18n.
- 자녀 이야기는 읽기 전용. 날짜는 서버 UTC ISO → 표시 전 로컬 변환. 감정 문자열은 콤마 구분, 첫 감정이 대표.
- **가족톡방은 폐지** — rooms 관련 코드를 이식하지 말 것. 이야기 탭은 가족 피드(`families/{id}/feed/`) 기반 공유이야기 UI로(docs/14 §4-3, 가족당 피드 1개·방 개념 없음).
- 문자열은 처음부터 키로(영어 기본, 한국어 번역). 바텀시트는 전부 흰색(SeamSheet — 개별 색 지정 금지). 웹 모바일 프레임 max-width 440px 유지.
- 데모: demo-mom / (비번은 허브 secrets/demo-accounts.md).

## 포팅 상태
**부모앱 전 화면 이식 완료 (08-19)** — 기반 계층·인증·홈 8섹션·일기 상세·마음이야기·리포트 C-1·우체통(알림 상세·월간보고서 모달)·마이페이지·이야기 탭(가족 피드, 셸 4탭). PortingPlaceholder 없음. 학생앱 톡방→가족 피드 복귀도 완료(mDiary_front, docs/14 §5-9b). 남음: 컷오버 대조 스모크(§5-10 — dev4 육안 대조). 번들 ~950KB(gzip 267KB) — recharts·html2canvas 편입, 라우트 지연 로딩은 후속 후보.
