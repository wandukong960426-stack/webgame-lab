# AI 공동작업 인수인계

이 문서는 Codex와 Claude가 작업 상태를 공유하는 짧은 장부다. 작업을 시작할 때 Active work에 한 줄을 추가하고, PR을 열 때 Handoff record로 옮긴다. 오래된 세부 기록은 PR에 남기고 이 문서는 간결하게 유지한다.

## Active work

| 담당 | 브랜치 | 작업 | 수정 예정 파일 | 상태 |
|---|---|---|---|---|
| 없음 | - | - | - | 대기 |

상태 값: `계획`, `작업 중`, `검증 중`, `PR 열림`, `차단됨`

## Handoff record

### 추리 재판 게임 표준 지정 반영

- 담당 AI: Claude
- 목표: 사용자가 표준으로 지정한 사건 002 v2.4 검수본(`case002-review.html`)과 인수인계(`case002-claude-handoff.md`)를 저장소 규칙으로 기록
- 브랜치: `claude/detective-trial-game-design-s8p8e0`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `docs/TRIAL_GAME_STANDARD.md`(신규), `docs/TRIAL_CASE002_HANDOFF.md`(원문 그대로), `prototypes/case-002-same-room/case002-review.html`(원문 그대로), `prototypes/case-002-same-room/README.md`, `CLAUDE.md`, `docs/AI_HANDOFF.md`
- 구현 결과: 게임 코드 변경 없음. 표준 파일 보관, 작업 규칙 정리, CLAUDE.md 세션 체크리스트와 표준 요약 추가. 아래 사건 002·001 Claude 시험본 기록은 표준 이전 산출물로, 기준이 아님
- 검증 명령과 결과: 표준 HTML SHA256이 원문 값과 일치. 헤드리스 Chromium 1440×900 자동 진행(입정 → 대조 3개 → 선고 → 복기) 페이지 오류 0, 외부 요청 0, 검수 모드·검수 저장 키 확인
- 모바일·PC 확인: 실제 브라우저·실기기 NOT TESTED
- 확인하지 못한 항목: 인수인계 8장의 NOT TESTED 항목 전부(실브라우저 잘림·겹침, 실기기 터치·전체화면, 실제 회원 로그인·적립·칭호·커뮤니티), Sites 소스(이 저장소에 없음)
- 위험·롤백: 문서·참조 파일만 추가. revert로 되돌림
- 다음 담당자가 할 일: 추리 재판 작업 전 `docs/TRIAL_GAME_STANDARD.md` 확인. 사건 001 시험본의 Google Fonts 외부 링크는 표준 형식과 어긋나므로 다음 수정 때 제거 검토
- 배포 상태: 구현 안 됨(문서 반영만)

### 사건 002 「같은 방, 다른 진술」 연출을 사건 001 index.html 수준으로 보강

- 담당 AI: Claude
- 목표: 사용자가 올린 미완성 사건 002(`11.html`, 법정 플레이판 v2.2)를 이 채팅에서 만든 사건 001 `index.html`처럼 업데이트
- 브랜치: `claude/detective-trial-game-design-s8p8e0`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `prototypes/case-002-same-room/index.html`, `prototypes/case-002-same-room/README.md`, `docs/AI_HANDOFF.md`
- 구현 결과: 첫 커밋에 원본을 그대로 넣고, 다음 커밋에서 인물 초상 빈칸 버그 수정(PNG 초상 시트 → WebP), 진영 색, 발언자 카메라, 타자 효과, 장 제목 카드, 모순·명령·선고 연출, 경고 흔들림, 상단 대조 표시, 입정·CCTV·판결 화면 장식, 이미지 Blob URL 변환을 추가. 사건 진행·진상·저장 키는 그대로
- 검증 명령과 결과: Playwright(Chromium)로 1440×900 유죄, 390×844 무죄 경로를 입정부터 복기·진상까지 자동 완주(대조 3개 오답 1회 포함, 콘솔 오류 0). 원본도 같은 경로로 완주해 비교. 모션 줄이기, 지난 장면 열람, 타자 효과 건너뛰기 확인. `npm run typecheck`·`npm run build`·`npm run smoke` 모두 통과. 파일 3.36MB → 0.50MB, 법정 화면 렌더 HTML 108KB → 3KB
- 모바일·PC 확인: 헤드리스 Chromium 화면 캡처로 확인. 실기기 미확인
- 확인하지 못한 항목: 실기기 터치 체감, Google Fonts 실제 로딩, 구버전 Safari의 `color-mix()`·`mask-composite` 표시
- 위험·롤백: `prototypes/` 폴더는 Next.js 빌드·배포 대상이 아님. 시각 연출 커밋만 revert하면 원본으로 돌아감(단 원본은 초상이 비어 보임)
- 다음 담당자가 할 일: 사용자 실기기 플레이 피드백 반영. 공식 사이트에 올릴 경우 1.html 같은 실행 페이지와 `trial-assets/` 경로는 별도 결정
- 배포 상태: 구현됨 (병합·Preview·공식 도메인 반영 없음)

### 11분의 공백 시각 연출 보강

- 담당 AI: Claude
- 목표: 사용자가 올린 추리형 재판 게임 `11분의 공백` 단일 HTML 검수본의 디자인·시각 요소 보강
- 브랜치: `claude/detective-trial-game-design-s8p8e0`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `prototypes/eleven-minute-gap/index.html`, `prototypes/eleven-minute-gap/README.md`, `docs/AI_HANDOFF.md`
- 구현 결과: 첫 커밋에 원본 파일을 그대로 넣고, 다음 커밋에서 화자 초상·진영 색 이름표, 발언자 카메라, 타자 효과, 장 제목 카드, 서막 CCTV 공백·119 녹취 연출, 증거 영상 오버레이, 증거 확보·모순·시각 보정·결정적 장면·선고 피드백, 헤더 핵심 증거 표시, 입장·도면·시계·판결 화면 장식을 추가. 게임 로직·저장 키는 그대로이며 `render()` 끝의 `decorate()` 호출 하나만 기존 코드에 추가
- 검증 명령과 결과: Playwright(Chromium)로 1440×900·390×844에서 입장부터 후일담까지 유죄·무죄 각각 자동 완주(88화면, 콘솔 오류 0), 1280×720·1920×1080·820×1180 개별 화면, 모션 줄이기(OS·게임 설정) 확인, 이력 이동·숫자키·핵심 증거 버튼 확인. `npm install`·`npm run typecheck`·`npm run build`·`npm run smoke`(17개 항목) 모두 통과. 검수본 파일은 Next.js 빌드 대상이 아니므로 앱 결과에는 영향 없음. 렌더 비용: 증거 비교 화면 렌더 HTML 814KB → 4KB, 렌더 8.6ms → 0.5ms(헤드리스 측정)
- 모바일·PC 확인: 헤드리스 Chromium 화면 캡처로 확인. 실기기(iOS Safari·Android Chrome) 미확인
- 확인하지 못한 항목: 실기기 터치 체감, Google Fonts 실제 로딩(검증 환경에서 외부 글꼴 차단 가능), Safari의 `color-mix()`·`:has()` 미지원 구버전 표시
- 위험·롤백: `prototypes/` 폴더는 Next.js 빌드·배포 대상이 아니므로 운영 영향 없음. 되돌릴 때는 시각 연출 커밋만 revert하면 원본 검수본으로 돌아감
- 다음 담당자가 할 일: 사용자가 실제 브라우저로 플레이해 연출 강도(카메라 확대, 타자 속도, 피드백 길이) 피드백을 주면 조정. 이 게임을 딴짓모아 Next.js 앱에 정식 편입할지는 별도 결정 필요
- 배포 상태: 구현됨 (병합·Preview·공식 도메인 반영 없음)

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
