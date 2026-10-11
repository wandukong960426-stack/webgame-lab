# 마지막 송출 — 개선판

폐국 두 시간 전 지역 라디오 해담FM에서 1999년 홍수 경보의 진실이 담긴 원본 릴이 사라진다. 현장 기자 **서하**와 송출실 기술자 **이안**이 서로 다른 자료를 맞춰 자정 전에 원본을 찾고, 누가 어떻게 가져갔는지 증명하는 2인 협동 추리게임.

> 이 폴더는 딴짓모아 Next.js 사이트(`app/`)와 분리된 독립 실행본이다. 사이트 빌드·사이트맵·배포 어디에도 연결되어 있지 않으며, 운영 사이트나 Production에 배포하지 않았다.

## 바로 하기

| 방법 | 설명 |
|---|---|
| `dist/last-broadcast.html` | 설치 없이 브라우저로 여는 단일 파일. 더블클릭으로 실행된다. |
| `improved/index.html` | 같은 게임을 파일별로 나눈 원본. 역시 바로 열린다 (ES 모듈을 쓰지 않아 `file://`에서도 동작). |

- 모드: **2인 협동 (한 기기 번갈아)** 또는 **혼자 검수 (두 역할 오가기)**. 원격 두 기기 동기화는 지원하지 않는다 (서버 없음).
- 예상 시간: 30~40분 — **사람 플레이테스트 전 추정치**다.
- 저장: 브라우저 `localStorage`에 자동 저장 (`last-broadcast.save`, 설정은 `last-broadcast.settings`). 다른 기기와 동기화되지 않는다.
- 소리: Web Audio로 합성한 효과음. 시작 버튼을 누른 뒤에만 재생되고 메뉴에서 끄기·볼륨 조절이 된다. TTS는 쓰지 않으며 소리 정보는 모두 화면 글로도 나온다.

## 폴더 구성

```
original/            원본 보존 (수정하지 않음)
improved/
  index.html         페이지 골격
  css/game.css       화면 스타일
  js/case-data.js    사건 데이터: 인물·장소·증거·인터뷰·공동 분석·결론·힌트·장면
  js/engine.js       상태 모델·조건 평가·채점·저장/복구 (DOM 없음)
  js/art.js          직접 그린 SVG 장면·물건·인물·CCTV 프레임·파형
  js/audio.js        Web Audio 효과음과 녹음 재생 합성
  js/ui.js           화면 렌더링과 입력 처리
tools/build.mjs      단일 HTML 생성 (Node 내장 모듈만)
dist/                생성된 단일 HTML (npm run build)
checks/
  engine.test.cjs    엔진·데이터 검사 32개 (Node 내장 모듈만)
  browser-qa.mjs     실제 Chromium 검수 30개 (playwright-core)
docs/
  CHANGES.md         원본 문제 → 변경 → 플레이 영향
  CASE_FILE_SPOILERS.md  ⚠ 스포일러: 실제 타임라인, 인물별 행동·거짓말, 증거-결론 대응표
  QA_REPORT.md       수행한 검수와 미검증 항목
```

## 명령

```bash
cd projects/last-broadcast
npm install          # 브라우저 검수용 playwright-core 하나만 설치 (게임 실행에는 필요 없음)
npm run build        # dist/last-broadcast.html 다시 만들기
npm test             # 엔진·데이터 검사
npm run qa           # improved/index.html 브라우저 검수
npm run qa:dist      # 단일 HTML 브라우저 검수
```

브라우저 검수는 Chromium 실행 파일이 필요하다. `CHROMIUM_PATH` 환경변수로 경로를 지정하거나, 지정하지 않으면 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`을 찾는다. `QA_SHOTS=<폴더>`를 주면 화면 캡처를 남긴다.

`playwright-core`는 이 폴더의 개발 의존성일 뿐 루트 `package.json`과 사이트 빌드에는 추가하지 않았다. 추가 사유: 이전 검사(DOM 스텁)로는 실제 화면·레이아웃·대화상자·뒤로 가기를 검증할 수 없어서.

## 알려진 한계

- 사람 플레이테스트, 실제 모바일 기기, Safari·Firefox, 화면 낭독기 실사용은 확인하지 못했다 (`docs/QA_REPORT.md`).
- 같은 기기의 다른 탭에서 동시에 진행하면, 나중에 저장된 탭이 이기고 다른 탭은 저장을 멈춘 뒤 새로 고침을 안내한다.
- 원격 멀티플레이는 범위에서 제외했다. URL이나 localStorage만으로 원격 플레이를 흉내 내지 않는다.
