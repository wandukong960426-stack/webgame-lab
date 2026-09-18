# AGENTS.md

이 파일은 ChatGPT Codex가 이 저장소에서 작업할 때 따라야 하는 최상위 규칙이다.

## 시작 전 필수 확인

다음 순서로 읽는다.

1. `docs/PROJECT_STATE.md`
2. `docs/SITES_PARITY.md`
3. `docs/AI_HANDOFF.md`
4. 최근 커밋과 열린 Pull Request
5. 변경하려는 파일의 현재 코드와 테스트

문서와 실제 코드가 충돌하면 실제 코드와 검증 결과를 우선하고, 문서를 함께 정정한다.

## 배포 경계

- 현재 `https://ttanjitmoa.com`의 운영본은 ChatGPT Sites 계열이다.
- 이 GitHub 저장소의 `main`은 현재 운영본과 다른 Next.js 코드베이스다.
- 사용자가 명시적으로 운영 전환을 승인하기 전까지 이 저장소를 공식 Production이라고 표현하지 않는다.
- GitHub 변경, PR 병합, Vercel Preview, 공식 도메인 배포를 서로 다른 상태로 구분한다.
- 기존 Sites 운영본이나 공식 도메인을 이 저장소로 덮어쓰지 않는다.
- 배포 완료 보고는 실제 공식 도메인과 배포 식별 정보를 확인한 뒤에만 한다.

## 공동작업 규칙

- Codex 브랜치: `codex/<작업명>`
- Claude 브랜치: `claude/<작업명>`
- 공용 설정·문서 브랜치: `chore/<작업명>`
- AI는 `main`에 직접 커밋하거나 직접 병합하지 않는다.
- 한 PR에는 하나의 목적만 담는다.
- 작업 시작 전 `docs/AI_HANDOFF.md`의 Active work를 확인한다.
- 다른 작업자가 Active로 표시한 파일은 같은 PR에서 수정하지 않는다. 충돌이 예상되면 별도 파일 또는 별도 PR로 분리한다.
- 작업 완료 시 `docs/AI_HANDOFF.md`에 브랜치, 변경 파일, 검증 결과, 남은 위험을 기록한다.
- 비밀키, 토큰, OAuth secret, DB 연결 문자열을 커밋하지 않는다.

## 보존 원칙

사용자의 명시적 승인 없이 다음을 삭제·축소·이름 변경하지 않는다.

- 기존 게임과 게임 URL
- 저장 기능과 게임 규칙
- 다국어, SEO, canonical, hreflang, OG, Twitter, schema.org
- Search Console·네이버 인증
- AdSense 연결 정보와 법률 페이지
- 완두콩 브랜드와 운영자 정보

현재 Sites 전용 기능은 `docs/SITES_PARITY.md`에서 이관 여부가 확정되기 전까지 GitHub에 존재한다고 가정하지 않는다.

## 구현 완료 조건

변경 범위에 맞게 다음을 실행하고 결과를 PR에 적는다.

```bash
npm install
npm run typecheck
npm run build
npm run smoke
```

- 게임 변경은 시작, 조작, 승패, 재시작, 저장·복구를 확인한다.
- UI 변경은 모바일과 PC를 확인한다.
- SEO·광고 변경은 기존 메타데이터와 동의 조건을 회귀 검사한다.
- 실패하거나 확인하지 못한 항목을 숨기지 않는다.

## 보고 형식

항상 다음 네 상태를 구분한다.

1. 구현됨
2. 자동검증 통과
3. PR 병합됨
4. 공식 도메인 배포·확인됨
