# 딴짓모아

설치·회원가입 없이 바로 즐기는 한국어 브라우저 게임 플랫폼 MVP입니다.

## 현재 구성
- Next.js 16 + React 19
- `/games/omok`: 컴퓨터 대전 / 같은 기기 2인용 오목
- `/admin`: Google OAuth 관리자 페이지
- Neon PostgreSQL `games` 테이블
- Vercel 배포 대응

## 필요한 운영 환경변수
```env
DATABASE_URL="..."
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
ADMIN_EMAILS="owner@gmail.com"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

Google OAuth 승인된 리디렉션 URI는 운영 도메인 기준 `https://your-domain.com/api/auth/callback/google` 입니다.

> 비밀키와 실제 DB 연결 문자열은 GitHub에 커밋하지 않습니다.
