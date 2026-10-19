# AI 공동작업 인수인계

이 문서는 Codex와 Claude가 작업 상태를 공유하는 짧은 장부다. 작업을 시작할 때 Active work에 한 줄을 추가하고, PR을 열 때 Handoff record로 옮긴다. 오래된 세부 기록은 PR에 남기고 이 문서는 간결하게 유지한다.

## Active work

| 담당 | 브랜치 | 작업 | 수정 예정 파일 | 상태 |
|---|---|---|---|---|
| 없음 | - | - | - | 대기 |

상태 값: `계획`, `작업 중`, `검증 중`, `PR 열림`, `차단됨`

## Handoff record

### 사건 004 「구하지 않은 밤」 검수본 보완

- 담당 AI: Claude
- 목표: 사용자가 전달한 사건 004 단일 HTML(사이트 배포 v194 내보내기)의 부적합한 부분을 기본 초석(시리즈 인수인계 v1.0) 기준으로 확인하고 보완
- 브랜치: `claude/detective-trial-game-design-s8p8e0`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `prototypes/case-004-unrescued-night/case004-original.html`(원본 그대로), `prototypes/case-004-unrescued-night/case004-review.html`(신규 검수본), `prototypes/case-004-unrescued-night/README.md`, `docs/TRIAL_GAME_STANDARD.md`(10장 표), `docs/AI_HANDOFF.md`
- 구현 결과: 원본은 고치지 않고 검수본을 따로 만듦. 이름 미입력 중복 호칭, 글자 크기 미적용, 포커스 유실, 모바일 가로 스크롤·이름표 겹침, PC 선택지 밀림, 초상 칸 비침, 대사 없는 응답, Esc·판결 창 복귀, 전체화면 표시, 상대 링크를 고침. 호칭 7곳, 칸별 오답 설명·2단계 힌트, 공개 시점에 맞춘 직접 질문 22개(새 응답 11개), 막 카드·증거 접수·대조 도장·선고 카드(의사봉 없음), 법정 화면 지난 발언 열람, 선고 뒤 속마음 후일담, 방청석·판사 손 그림, “여섯 사람”→“네 사람”, 검수본 표시와 별도 저장 키(원본 키 이어받기)를 추가. 진상·증거·정답·판결 조건은 그대로
- 검증 명령과 결과: 헤드리스 Chromium(Playwright)으로 네 판결 조합 완주(1440×900·1366×768·390×844·1280×800 동작 줄이기, 오답·힌트 포함, 콘솔 오류 0, 외부 요청 0). 기능 점검 27항목 PASS(1440×900·390×844). 8개 화면 크기 가로 스크롤·이름표 겹침 없음. `npm run typecheck`·`npm run build`·`npm run smoke` 통과
- 모바일·PC 확인: 헤드리스 화면 캡처로만 확인. 실제 브라우저·실기기 NOT TESTED
- 확인하지 못한 항목: 실브라우저 잘림·겹침, 실기기 터치·소프트 키보드·전체화면, 화면낭독기, 내려받은 파일 이름, 회원 적립·칭호(독립 HTML에서 의도적 분리), 운영판 v194 자체
- 위험·롤백: `prototypes/` 폴더는 Next.js 빌드·배포 대상이 아님. 검수본 커밋만 revert하면 원본만 남음. Claude가 새로 쓴 문장(질문 응답·오답 설명·속마음 후일담·호칭)은 사용자 검토 필요
- 다음 담당자가 할 일: 사용자 실브라우저·실기기 플레이 피드백 반영. 운영판에 반영하려면 Sites 소스(v194, 커밋 `9394bdf3…`)에서 같은 수정을 적용해야 하며 이 HTML을 덮어쓰지 않는다
- 배포 상태: 구현됨 (병합·Preview·공식 도메인 반영 없음)

### 추리 재판 시리즈 인수인계 v1.0을 기본 초석으로 반영

- 담당 AI: Claude
- 목표: 사용자가 2026-10-18 지정한 「딴짓모아 추리재판 시리즈 인수인계 v1.0」 묶음을 앞으로의 추리 재판 게임 제작 기본 초석으로 저장소 규칙에 기록
- 브랜치: `claude/detective-trial-game-design-s8p8e0`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `docs/trial-series-v1.0/`(원문 6개 그대로), `docs/TRIAL_GAME_STANDARD.md`(0장 신설, 사건 002 v2.4 표준은 하위 기준으로 위치 조정, 10장 표), `CLAUDE.md`(세션 체크리스트·표준 요약), `prototypes/case-003-erased-statement/README.md`(초석 1차 대조), `docs/AI_HANDOFF.md`
- 구현 결과: 게임 코드 변경 없음. 묶음 파일 해시가 매니페스트와 일치함을 확인. 자료 우선순위, 시리즈 기준 원본(사건 001 v189 운영판, 이 저장소에 없음), Q1·Q2 기본값(확답 아님), 바뀐 기준(장면별 질문, 유무죄 선택, 판사석 1인칭·좌우, 의사봉 비필수, 제작 순서·67항목 검수표)을 정리
- 검증 명령과 결과: 묶음 SHA256 대조 일치. `npm run typecheck`·`npm run build`·`npm run smoke` 통과
- 모바일·PC 확인: 해당 없음(문서 변경)
- 확인하지 못한 항목: 1편 참고 소스 ZIP `11-minute-gap_deployed-v188_in-site-v189.zip` 미수령, 사건 001·002 운영 배포 상태(원문 기록만 있음), Q1·Q2·Q3 사용자 답
- 위험·롤백: 문서만 변경. revert로 되돌림
- 다음 담당자가 할 일: 추리 재판 작업 전 `docs/TRIAL_GAME_STANDARD.md` 0장과 원문 확인. 사건 003 검수본은 초석 기준 JD-01(유무죄 선택 없음)·QA-01(공통 질문 2개)·ID-02(직접 개정 조작 없음)·의사봉 연출이 미충족 또는 결정 필요(README 참조). 새 사건은 설계 템플릿과 67항목 검수표로 시작
- 배포 상태: 구현 안 됨(문서 반영만)

### 사건 003 「지워진 첫 진술」 검수본 보완

- 담당 AI: Claude
- 목표: 사용자가 전달한 사건 003 단일 HTML을 `docs/TRIAL_GAME_STANDARD.md` 기준으로 업데이트·보완
- 브랜치: `claude/detective-trial-game-design-s8p8e0`
- PR: 아직 없음 (사용자 요청 시 생성)
- 변경 파일: `prototypes/case-003-erased-statement/case003-original.html`(원본 그대로), `prototypes/case-003-erased-statement/case003-review.html`(신규 검수본), `prototypes/case-003-erased-statement/README.md`, `docs/TRIAL_GAME_STANDARD.md`(10장 파일 표), `docs/AI_HANDOFF.md`
- 구현 결과: 원본은 고치지 않고 검수본을 따로 만듦. 검수본 표시·noindex·검수 저장 키(원본 키에서 이어하기, 원본 기록 보존), 초상·장면 이미지 빈칸 수정(PNG → WebP, 7.0MB → 0.82MB), 재판장 이름 호칭, 재판장 질문·답변·기록(선택·직접 입력, 저장), 지난 발언 열람, 진영 색·카메라·타자 효과·막 카드·모순/확인 도장·선고 의사봉·오답 흔들림·쟁점 진행 표시·무죄 인장, 선택 응답 초상, 알림 위치, 모션 줄이기. 사건 진행·진상·정답·판결 조건·후일담은 그대로
- 검증 명령과 결과: 헤드리스 Chromium(Playwright)으로 1440×900 기본 결말, 1440×900·390×844 확장 결말, 1280×800 모션 줄이기 확장 결말 완주(오답 포함, 콘솔 오류 0, 외부 요청 0). 호칭·재판장 발언·초안·지난 발언 복귀·새로고침 이어하기·내보내기/불러오기·원본 저장 이어하기·알림 겹침·초점 순환/복귀·좁은 화면 메뉴 버튼·쟁점 이름 숨김·발언 300회 후 초기 기록 유지 PASS. 표준 회귀 체크리스트 적용 결과는 README에 기록. `npm run typecheck`·`npm run build`·`npm run smoke` 통과
- 모바일·PC 확인: 헤드리스 화면 캡처로만 확인. 실제 브라우저·실기기 NOT TESTED
- 확인하지 못한 항목: 실브라우저 잘림·겹침, 실기기 터치·소프트 키보드·전체화면, 내려받은 파일 이름, 소리, 회원 적립·칭호·커뮤니티(독립 HTML에서 의도적 분리), 모달 위에 도움말을 겹쳐 여는 경로(원본 구조상 불가로 보이나 검사 안 함)
- 위험·롤백: `prototypes/` 폴더는 Next.js 빌드·배포 대상이 아님. 검수본 커밋만 revert하면 원본만 남음
- 다음 담당자가 할 일: 사용자 실브라우저·실기기 플레이 피드백 반영. 사이트에 올릴 경우 실행 페이지·자산 경로·회원 연동은 별도 결정
- 배포 상태: 구현됨 (병합·Preview·공식 도메인 반영 없음)

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
