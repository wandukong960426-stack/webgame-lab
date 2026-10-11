# AI 공동작업 인수인계

이 문서는 Codex와 Claude가 작업 상태를 공유하는 짧은 장부다. 작업을 시작할 때 Active work에 한 줄을 추가하고, PR을 열 때 Handoff record로 옮긴다. 오래된 세부 기록은 PR에 남기고 이 문서는 간결하게 유지한다.

## Active work

| 담당 | 브랜치 | 작업 | 수정 예정 파일 | 상태 |
|---|---|---|---|---|
| Claude | `claude/game-quality-improvement-1qqat7` | 「마지막 송출」 추리게임 개선판 (독립 폴더, 사이트 미연결) | `projects/last-broadcast/**`, `docs/AI_HANDOFF.md` | 검증 중 (PR 미생성) |

상태 값: `계획`, `작업 중`, `검증 중`, `PR 열림`, `차단됨`

## Handoff record

### 「마지막 송출」 플레이 품질 전면 개선

- 담당 AI: Claude
- 목표: 사용자가 첨부한 「마지막 송출」 원본(별도 배포본)을 실제로 플레이할 수 있는 추리게임으로 재제작. 추리 깊이·증거 조사·2인 협동·연출 보강
- 브랜치: `claude/game-quality-improvement-1qqat7`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `projects/last-broadcast/` 전체 신규 (`original/` 원본 보존, `improved/` 개선판, `dist/last-broadcast.html` 단일 실행본, `tools/`, `checks/`, `docs/`), 이 문서. 사이트 코드(`app/`, `components/`, `lib/`)·루트 `package.json`·배포 설정은 건드리지 않음
- 구현 결과: 3막 사건 재설계, 증거 84개·조사 지점 39곳·인터뷰 24개, 공동 분석 6개(+음원 대조), 중간 결론 2회, 6문장 최종 보고서, 3단계 힌트, 2인(한 기기)·혼자 검수 모드, 저장 v2·손상 복구. 원격 멀티플레이는 범위 제외
- 검증 명령과 결과: `projects/last-broadcast`에서 `npm test` 32/32, `npm run qa` 30/30, `npm run qa:dist` 30/30 (Chromium 141). 루트 `npm install`·`npm run typecheck`·`npm run build`·`npm run smoke` 통과 (빌드가 바꾼 `tsconfig.json`·`next-env.d.ts`·루트 `package-lock.json`은 되돌림)
- 모바일·PC 확인: 자동 검사로 360/390/768/1024/1440px 가로 넘침·화면 밖 요소·터치 영역 확인, 캡처 육안 확인. 실기기 미확인
- 확인하지 못한 항목: 사람 플레이테스트(시간·난이도), 실제 모바일 기기, Safari·Firefox, 화면 낭독기, 효과음 청감 (`projects/last-broadcast/docs/QA_REPORT.md`)
- 위험·롤백: 독립 폴더라 사이트에 영향 없음. 폴더 삭제로 롤백
- 다음 담당자가 할 일: 사람 2인 플레이테스트로 시간·난이도·힌트 조정, Safari·Firefox·실기기 확인, 공개 방식(판매 브랜드 사이트 등)은 사용자 결정 후 별도 작업
- 배포 상태: 구현됨 · 자동검증 통과(로컬) · 병합 안 됨 · Preview/공식 도메인 해당 없음

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
