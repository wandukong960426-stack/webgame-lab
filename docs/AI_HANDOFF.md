# AI 공동작업 인수인계

이 문서는 Codex와 Claude가 작업 상태를 공유하는 짧은 장부다. 작업을 시작할 때 Active work에 한 줄을 추가하고, PR을 열 때 Handoff record로 옮긴다. 오래된 세부 기록은 PR에 남기고 이 문서는 간결하게 유지한다.

## Active work

| 담당 | 브랜치 | 작업 | 수정 예정 파일 | 상태 |
|---|---|---|---|---|
| Claude | `claude/mystery-trial-demo-enhancement-yzf2mc` | 재판 게임 체험판(사건 001 · 11분의 공백) 재미 보강 | `prototypes/trial-001/*`, `docs/AI_HANDOFF.md` | 검증 중 |

상태 값: `계획`, `작업 중`, `검증 중`, `PR 열림`, `차단됨`

## Handoff record

### 재판 게임 체험판 v5 · 재미 보강

- 담당 AI: Claude
- 목표: 사용자가 전달한 독립 HTML 체험판(사건 001 「11분의 공백」 v4)의 재미 보강
- 브랜치: `claude/mystery-trial-demo-enhancement-yzf2mc`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `prototypes/trial-001/index.html`, `prototypes/trial-001/README.md`, `docs/AI_HANDOFF.md`
- 구현 결과: 7개 쟁점(보강이 정답인 쟁점 추가), 문서의 결론 문장 제거, 휴정 자원, 블랙박스 프레임 검증, 피고인 대면·자백 분기, 11분 복원 시간표, 두 축 칭호·결과 카드, 오프닝·화자 배지·타자 효과·효과음, 고난도 모드, 이미지 WebP 변환(5.7MB → 0.48MB). 상세는 `prototypes/trial-001/README.md`
- 검증 명령과 결과: `npm install`, `npm run typecheck`, `npm run build`, `npm run smoke` 통과. Headless Chromium 플레이 스루 3경로(자백·유죄 / 고난도·무죄 / v4 저장 이어하기) 101개 단언 통과, 페이지·콘솔 오류 없음
- 모바일·PC 확인: 헤드리스 1440×900, 390×844 스크린샷 확인
- 확인하지 못한 항목: 실제 휴대폰 기기, iOS Safari, 스크린리더, Web Share API 실제 공유 동작, Codex 검토
- 위험·롤백: `prototypes/`는 Next.js에서 서비스되지 않아 사이트 영향 없음. 되돌리려면 폴더 삭제
- 다음 담당자가 할 일: 사용자 플레이 피드백 반영, 사이트 탑재 시 진상 문구 지연 로드와 경로 결정, 실제 기기 확인
- 배포 상태: 구현됨 · 자동검증 통과(헤드리스) · 병합 안 됨 · Preview·공식 도메인 반영 없음

### Claude GitHub 연결 확인

- 담당 AI: Claude
- 목표: Claude GitHub 연결 확인 (첫 연결 시험)
- 브랜치: `claude/connection-test`
- PR: 이 기록과 함께 Draft PR 생성
- 변경 파일: `docs/AI_HANDOFF.md`
- 구현 결과: 문서에 연결 확인 기록만 추가, 게임 코드·배포 설정 변경 없음
- 검증 명령과 결과: 문서 전용 변경으로 별도 실행 없음
- 모바일·PC 확인: 해당 없음 (문서 전용)
- 확인하지 못한 항목: GitHub Actions 통과 여부, Codex 검토
- 위험·롤백: 문서 변경만 있어 위험 없음, 필요 시 PR 닫기로 되돌림
- 다음 담당자가 할 일: GitHub Actions 통과 확인 후 Codex가 PR diff와 CI 결과 검토, 사용자 승인 후 병합
- 배포 상태: 구현됨

### 작성 양식

- 담당 AI:
- 목표:
- 브랜치:
- PR:
- 변경 파일:
- 구현 결과:
- 검증 명령과 결과:
- 모바일·PC 확인:
- 확인하지 못한 항목:
- 위험·롤백:
- 다음 담당자가 할 일:
- 배포 상태: 구현 안 됨 / 구현됨 / 자동검증 통과 / 병합됨 / Preview 확인 / 공식 도메인 확인

## 충돌 방지 규칙

1. Active work에 등록된 파일은 해당 담당자의 PR이 닫힐 때까지 다른 AI가 수정하지 않는다.
2. 공통 파일 수정이 꼭 필요하면 기존 담당자의 PR 위에서 후속 커밋하지 말고 작업 순서를 정한다.
3. 서로 다른 PR이 같은 파일을 건드리면 먼저 병합된 PR 이후에 나머지 브랜치를 최신 `main`에 맞춘다.
4. 해결되지 않은 충돌을 자동 선택으로 덮어쓰지 않는다.
5. 인수인계에 없는 변경은 완료로 간주하지 않는다.

## 첫 연결 시험

Claude 연결 후 실제 게임 코드보다 먼저 다음 시험을 한다.

1. `claude/connection-test` 브랜치 생성
2. 이 문서의 Handoff record에 “Claude GitHub 연결 확인” 한 줄 추가
3. Draft PR 생성
4. GitHub Actions 통과 확인
5. Codex가 PR diff와 CI 결과 검토
6. 사용자 승인 후에만 병합

이 시험은 공식 사이트와 배포 설정을 변경하지 않는다.
