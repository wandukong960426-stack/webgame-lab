# 딴짓모아

설치·회원가입 없이 PC와 모바일에서 바로 즐기는 한국어 브라우저 게임 플랫폼입니다.

## 현재 플레이 가능한 게임

- `/games/omok` — 15×15 오목, AI/같은 기기 2인, 무르기
- `/games/othello` — 8×8 오셀로, 패스·최종 집계, AI/2인
- `/games/2048` — 방향키·WASD·모바일 스와이프, 로컬 최고점
- `/games/tic-tac-toe` — 3×3 클래식, 5×5·4목 확장판
- `/games/chess` — 체크메이트·스테일메이트·캐슬링·앙파상·프로모션
- `/games/janggi` — 마·상의 멱, 포 발판, 궁성 대각선, 장군·외통, 한 수 쉼

모든 게임은 모바일 전체화면과 효과음을 지원합니다. 요소 전체화면을 제한하는 iOS·일부 인앱 브라우저에서는 화면 고정형 전체화면으로 대체됩니다.

## 기술 구성

- Next.js 16 App Router + React 19 + TypeScript
- Google OAuth 기반 `/admin` 콘텐츠·수익화 준비 관리
- Neon PostgreSQL `games` 테이블
- Vercel Git 배포
- `sitemap.xml`, `robots.txt`, Web App Manifest, 게임별 메타데이터
- `/api/release` 배포 소스·커밋·AdSense 상태 확인
- GA4가 연결된 환경에서는 게임 이벤트 전송

## 수익화 준비

현재 AdSense 게시자 ID는 `pub-1704306174088540`이며, 다음 연결 항목을 코드로 제공합니다.

- `google-adsense-account` 소유권 확인 메타 태그
- 루트 `/ads.txt`
- 승인·동의·운영 활성화 조건을 모두 확인하는 광고 스크립트 게이트
- 6개 게임의 조작 영역 밖 하단 광고 위치
- 관리자 `/admin` 수익화 준비 체크리스트
- CI와 프로덕션 감사의 AdSense 상태 검사

기본값에서는 광고 요청을 보내지 않습니다. 지급 프로필, 사이트 승인, 동의 관리와 광고 단위를 실제로 준비한 뒤 환경변수를 단계적으로 활성화합니다.

전체 실행 순서는 [`docs/MONETIZATION.md`](docs/MONETIZATION.md), 프로덕션 증거 규칙은 [`docs/PRODUCTION.md`](docs/PRODUCTION.md)를 따릅니다.

## 로컬 실행

```bash
npm install
npm run dev
```

검증 가능한 프로덕션 빌드와 로컬 렌더링 검사는 Pull Request CI에서 자동 수행합니다.

```bash
npm run typecheck
npm run build
npm run start
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke
```

공식 도메인이 이 저장소의 특정 커밋을 실제로 제공하는지 확인하려면 다음을 실행합니다.

```bash
EXPECTED_GIT_SHA=<full-commit-sha> npm run audit:production
```

## 운영 환경변수

```env
DATABASE_URL="..."
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
ADMIN_EMAILS="owner@gmail.com"
NEXT_PUBLIC_SITE_URL="https://ttanjitmoa.com"

NEXT_PUBLIC_ADSENSE_PUBLISHER_ID="pub-1704306174088540"
ADSENSE_PAYMENT_PROFILE_READY="false"
ADSENSE_SITE_ADDED="false"
NEXT_PUBLIC_ADSENSE_SITE_APPROVED="false"
NEXT_PUBLIC_ADSENSE_CONSENT_READY="false"
NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=""
NEXT_PUBLIC_ADSENSE_ENABLED="false"
```

Google OAuth 승인된 리디렉션 URI는 운영 도메인 기준 `https://ttanjitmoa.com/api/auth/callback/google` 입니다.

초기 DB 구성은 `db/schema.sql`을 Neon SQL Editor에서 한 번 실행합니다. 비밀키와 실제 DB 연결 문자열은 GitHub에 커밋하지 않습니다.
