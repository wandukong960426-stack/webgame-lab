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
- Google OAuth 기반 `/admin` 콘텐츠 관리
- Neon PostgreSQL `games` 테이블
- Vercel Git 배포
- `sitemap.xml`, `robots.txt`, Web App Manifest, 게임별 메타데이터
- GA4가 연결된 환경에서는 `game_start`, `game_end`, `game_restart`, `game_mode_change`, `game_fullscreen` 이벤트 전송

## 로컬 실행

```bash
npm install
npm run dev
```

## 운영 환경변수

```env
DATABASE_URL="..."
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
ADMIN_EMAILS="owner@gmail.com"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

Google OAuth 승인된 리디렉션 URI는 운영 도메인 기준 `https://your-domain.com/api/auth/callback/google` 입니다.

초기 DB 구성은 `db/schema.sql`을 Neon SQL Editor에서 한 번 실행합니다. 비밀키와 실제 DB 연결 문자열은 GitHub에 커밋하지 않습니다.
