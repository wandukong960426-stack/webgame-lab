# AI 공동작업 인수인계

이 문서는 Codex와 Claude가 작업 상태를 공유하는 짧은 장부다. 작업을 시작할 때 Active work에 한 줄을 추가하고, PR을 열 때 Handoff record로 옮긴다. 오래된 세부 기록은 PR에 남기고 이 문서는 간결하게 유지한다.

## Active work

| 담당 | 브랜치 | 작업 | 수정 예정 파일 | 상태 |
|---|---|---|---|---|
| Claude | `claude/online-escape-game-analysis-ms0kr6` | 3D 방탈출 신규 추가 (`/games/escape-room`), 로컬 검증 완료·PR 생성 대기 | `app/games/escape-room/*`, `components/escape-room/*`, `lib/escape-room/*`, `app/styles/escape-room.css`, `docs/ESCAPE_ROOM.md`, `lib/game-catalog.ts`, `lib/game-progress.ts`, `components/GameShell.tsx`, `app/styles/{game-shell,home,progress}.css`, `app/globals.css`, `app/games/page.tsx`, `db/schema.sql`, `scripts/smoke.mjs`, `package.json` | 검증 중 |

상태 값: `계획`, `작업 중`, `검증 중`, `PR 열림`, `차단됨`

## Handoff record

### 3D 방탈출 「별지기의 서재」 신규 추가

- 담당 AI: Claude
- 목표: 사용자가 정리한 온라인 방탈출 조사(몰입·가독성·적정 좌절감·다양한 퍼즐·단서 연결·부담 없는 힌트·타이머/여유 선택)를 반영한 브라우저 3D 방탈출 추가
- 브랜치: `claude/online-escape-game-analysis-ms0kr6`
- PR: 아직 생성하지 않음 (사용자 요청 시 생성)
- 변경 파일:
  - 신규: `app/games/escape-room/{layout,page}.tsx`, `components/escape-room/{scene,textures,audio}.ts`, `components/escape-room/TelescopeView.tsx`, `lib/escape-room/puzzle.ts`, `app/styles/escape-room.css`, `docs/ESCAPE_ROOM.md`
  - 추가만 한 공용 파일: `lib/game-catalog.ts`(항목·`midnight` 테마), `lib/game-progress.ts`·`components/GameShell.tsx`(테마 타입), `app/styles/{game-shell,home,progress}.css`(테마 1줄씩), `app/globals.css`(import), `app/games/page.tsx`(설명 문구), `db/schema.sql`(시드 1행, `ON CONFLICT DO NOTHING`), `scripts/smoke.mjs`(경로 1개), `package.json`(`three`, `@types/three`), `README.md`, `docs/PROJECT_STATE.md`, `docs/SITES_PARITY.md`
- 구현 결과: Three.js 절차적 3D 서재(PBR·달빛 그림자·광선·블룸·외곽선), 8단계 퍼즐 체인, 3단계 힌트와 정체 감지 안내, 여유·도전(30분) 모드, 일시정지, 자동 저장·이어하기, 합성 배경음·효과음, 모바일 터치·전체화면, 조사 목록·키보드 조작, WebGL 미지원 시 텍스트 탐색 모드, 적응형 그래픽 품질
- 검증 명령과 결과:
  - `npm install` 통과, `npm run typecheck` 통과, `npm run build` 통과(`/games/escape-room` 정적 생성), `npm run smoke` 통과(신규 경로 canonical·sitemap 포함)
  - 규칙 모듈을 Node에서 직접 실행해 8단계 전 구간, 근접 오답, 책 순서 초기화, 힌트 상한, 저장 데이터 검증, 시간 증가 상한 확인
  - 헤드리스 Chromium(SwiftShader WebGL)에서 실제 3D 클릭으로 러그 → 열쇠 → 서랍 → UV 공개 → 궤짝 다이얼 → 렌즈 → 망원경 → 책장 → 퓨즈 → 도어락(근접 오답 후 키보드로 정답) → 엔딩까지 확인, 콘솔 오류 없음
  - 저장 후 새로고침 시 "이어하기" 표시 확인
- 모바일·PC 확인: 1100~1400px 데스크톱과 390×844 터치 에뮬레이션(스와이프 회전, 화면 가득 플레이, 힌트 시트), WebGL 비활성 텍스트 모드. 실기기는 미확인
- 확인하지 못한 항목: 실제 모바일 GPU(iOS Safari·안드로이드 크롬)의 프레임 속도·발열, 실제 스피커로 들은 소리 균형, 스크린리더 실사용, GitHub Actions 결과
- 위험·롤백: 기존 게임 코드는 수정하지 않았고 공용 파일은 추가만 했다. 되돌리려면 해당 커밋을 revert한다. `next dev`를 실행하면 `AGENTS.md`·`tsconfig.json`·`next-env.d.ts`가 자동으로 바뀌므로 커밋하지 않는다
- 다음 담당자가 할 일: Codex가 난이도·문구·SEO·접근성을 교차 검토, 실기기 QA(특히 저사양 안드로이드), PR 생성·CI 확인 후 사용자 승인으로 병합 여부 결정, Sites 전환 시 포함 여부를 `docs/SITES_PARITY.md`에서 결정
- 배포 상태: 구현됨 (로컬 자동검증 통과, PR·CI 미실행, 병합 안 됨, Preview·공식 도메인 해당 없음)

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
