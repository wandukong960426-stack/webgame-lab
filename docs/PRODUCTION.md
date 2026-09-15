# 딴짓모아 프로덕션 진실성 규칙

기준일: 2026-09-16

## 현재 상태

- 공식 도메인: `https://ttanjitmoa.com`
- 이 GitHub 저장소: `wandukong960426-stack/webgame-lab`
- 현재 공식 도메인은 이 저장소의 `main`과 기능 구성이 다른 별도 Sites 운영본을 제공한다.
- 따라서 GitHub PR 병합 또는 빌드 성공만으로 `ttanjitmoa.com 배포 완료`라고 보고하면 안 된다.
- 공식 도메인을 GitHub 버전으로 전환하기 전에는 Sites에만 있는 기능을 목록화하고 이관·폐기 여부를 결정해야 한다.

## 상태 용어

개발 보고에서는 아래 표현만 사용한다.

1. **구현됨**: 브랜치에 실제 Git diff가 존재한다.
2. **검증됨**: 타입 검사, 프로덕션 빌드, 로컬 렌더링 스모크 테스트가 통과했다.
3. **병합됨**: PR이 `main`에 병합됐다.
4. **프리뷰 확인됨**: 특정 프리뷰 URL에서 주요 경로와 UI를 직접 검사했다.
5. **프로덕션 확인됨**: 공식 도메인의 `/api/release`가 이 저장소와 기대 커밋을 반환하고 주요 경로 스모크 테스트가 통과했다.

앞 단계가 완료됐다고 다음 단계까지 완료된 것은 아니다.

## 프로덕션 확인 명령

```bash
npm run audit:production
```

특정 커밋까지 검증하려면:

```bash
EXPECTED_GIT_SHA=<full-commit-sha> npm run audit:production
```

GitHub Actions의 `Production source audit` 워크플로에서도 같은 검사를 수동 실행할 수 있다.

## 공식 도메인 전환 전 필수 조건

- [ ] Sites 운영본의 전체 URL과 기능 목록을 확보한다.
- [ ] 게임, 오늘의 도전, 전술 문제, 가이드, 다국어, 저장, 통계, 관리자 기능을 비교한다.
- [ ] GitHub로 이관할 기능과 폐기할 기능을 문서화한다.
- [ ] 개인정보 안내와 이용 안내가 실제 구현과 일치하는지 재검토한다.
- [ ] `NEXT_PUBLIC_SITE_URL=https://ttanjitmoa.com` 설정을 확인한다.
- [ ] 프리뷰에서 모바일·PC 실기기 테스트를 완료한다.
- [ ] 공식 도메인 전환 후 `/api/release`의 source와 commit을 확인한다.
- [ ] 홈, 게임, 법률 페이지, robots.txt, sitemap.xml을 공식 도메인에서 검사한다.
- [ ] Search Console과 네이버 서치어드바이저에서 새 sitemap을 다시 확인한다.

## 배포 금지 조건

다음 중 하나라도 해당하면 공식 도메인을 이 저장소로 덮어쓰지 않는다.

- Sites에만 있는 기능의 이관 여부가 정해지지 않음
- 개인정보 안내가 실제 데이터 처리와 다름
- 모바일 게임판 또는 핵심 게임이 실기기에서 작동하지 않음
- canonical, robots 또는 sitemap에 공식 도메인이 아닌 주소가 포함됨
- `/api/release`가 소스와 커밋을 식별하지 못함

## 완료 보고에 포함할 증거

- PR 번호와 병합 커밋
- 변경 파일 목록 또는 핵심 diff
- CI 타입 검사·빌드·스모크 결과
- 확인한 프리뷰 또는 공식 URL
- `/api/release`의 source와 commit
- 확인하지 못한 항목을 명시한 제한사항
