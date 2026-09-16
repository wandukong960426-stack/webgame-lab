# 딴짓모아 AdSense 수익화 실행서

기준일: 2026-09-16

## 목표

딴짓모아의 공식 도메인 `https://ttanjitmoa.com`을 Google AdSense에 연결하고, 사이트 검토·동의 관리·광고 단위 설정을 거쳐 정책을 준수하는 첫 광고 노출과 수익 측정을 시작한다.

수익화 완료는 아래를 모두 충족한 상태를 뜻한다.

1. 지급 프로필이 완료됐다.
2. 공식 도메인이 AdSense 사이트 목록에 등록되고 검토를 통과했다.
3. 공식 도메인의 `ads.txt`와 소유권 확인 메타 태그가 게시자 ID와 일치한다.
4. 적용 지역에 필요한 동의 관리가 실제로 게시됐다.
5. 광고 단위가 게임 조작을 방해하지 않는 위치에 설정됐다.
6. 공식 도메인의 `/api/release`에서 광고 활성 상태와 배포 커밋을 확인했다.
7. AdSense 보고서에 유효한 광고 요청·노출·수익 데이터가 나타났다.

## 확인된 계정 정보

- 게시자 ID: `pub-1704306174088540`
- AdSense client: `ca-pub-1704306174088540`
- 판매자 선언:

```text
google.com, pub-1704306174088540, DIRECT, f08c47fec0942fa0
```

2026-09-13에 수신한 Google AdSense 서비스 이메일 기준으로 지급 프로필 입력이 아직 필요한 상태다. Google은 사이트가 검토 중이라면 지급 프로필이 완료될 때까지 검토가 보류될 수 있다고 안내했다.

## 코드에서 완료한 항목

- 모든 공개 페이지에 `google-adsense-account` 메타 태그 제공
- 루트 `/ads.txt`에 게시자 판매자 선언 제공
- `/api/release`에서 게시자 ID, ads.txt 주소, 승인·동의·광고 송출 상태 공개
- 사이트 승인, 동의 관리, 운영 활성화가 모두 true일 때만 AdSense 스크립트 로드
- 광고 단위 slot ID가 없으면 광고 컨테이너도 렌더링하지 않음
- 6개 게임의 광고 위치를 게임판과 조작 버튼 아래 별도 영역으로 제한
- 개인정보 안내와 이용 안내를 광고 준비 상태에 맞춰 갱신
- CI에서 메타 태그, ads.txt, 광고 미활성 기본값을 자동 검사
- 프로덕션 감사에서 공식 도메인과 `/api/release`의 광고 상태 일치 여부 검사

## 운영자가 직접 해야 하는 순서

### 1. 지급 프로필 완료

AdSense의 지급 설정에서 다음을 실제 정보와 일치하게 입력한다.

- 계정 유형: 개인 또는 조직
- 신분증·공식 문서와 일치하는 이름
- 우편 PIN을 받을 수 있는 정확한 주소

계정 유형은 잘못 선택하면 이후 변경이 제한될 수 있으므로 실제 운영 주체를 기준으로 선택한다.

완료 후 배포 환경에 다음 값을 설정한다.

```text
ADSENSE_PAYMENT_PROFILE_READY=true
```

### 2. 공식 도메인 등록

AdSense의 사이트 메뉴에서 다음 도메인을 추가한다.

```text
ttanjitmoa.com
```

사이트 연결 방법으로 코드 스니펫, ads.txt 또는 메타 태그가 제시되면 공식 도메인에서 실제 응답을 확인한다.

```text
https://ttanjitmoa.com/ads.txt
```

페이지 원본에는 다음 메타 정보가 있어야 한다.

```html
<meta name="google-adsense-account" content="ca-pub-1704306174088540">
```

등록 후 배포 환경에 다음 값을 설정한다.

```text
ADSENSE_SITE_ADDED=true
```

### 3. 프로덕션 소스 확인

공식 도메인이 현재 별도 Sites 운영본을 제공하고 있다면 GitHub 변경만으로는 위 확인 파일과 메타 태그가 공식 도메인에 나타나지 않는다.

공식 도메인을 이 저장소로 전환하거나, 운영 중인 Sites 버전에 동일한 게시자 확인 정보를 반영해야 한다. 기능 이관 없이 도메인을 덮어쓰면 Sites에만 있는 콘텐츠를 잃을 수 있으므로 `docs/SITES_PARITY.md`의 이관 결정을 먼저 완료한다.

전환 후 다음을 실행한다.

```bash
EXPECTED_GIT_SHA=<배포할 전체 커밋 SHA> npm run audit:production
```

감사가 성공하기 전에는 사이트 연결 완료 또는 광고 배포 완료로 보고하지 않는다.

### 4. 사이트 검토 요청

공식 도메인의 다음 항목을 다시 확인한 뒤 AdSense 검토를 요청한다.

- 홈과 게임 페이지가 정상 응답
- 소개·문의·개인정보·이용 안내가 공개됨
- robots.txt와 sitemap.xml이 공식 도메인을 가리킴
- ads.txt와 게시자 메타 태그가 일치함
- 빈 페이지, 준비 중 페이지만 있는 URL, 중복 페이지가 없음
- 모바일에서 게임이 실제로 플레이 가능함

승인 통보 전에는 다음 값을 false로 유지한다.

```text
NEXT_PUBLIC_ADSENSE_SITE_APPROVED=false
NEXT_PUBLIC_ADSENSE_ENABLED=false
```

승인된 뒤에만 다음 값을 바꾼다.

```text
NEXT_PUBLIC_ADSENSE_SITE_APPROVED=true
```

### 5. 개인정보·동의 관리 게시

광고를 활성화하기 전에 Google Privacy & messaging 또는 Google 인증 CMP에서 필요한 메시지를 구성한다. 실제 서비스 국가와 광고 개인화 설정에 따라 필요한 지역 메시지를 게시한다.

동의 메시지를 실제 공식 도메인에서 확인한 뒤에만 다음 값을 바꾼다.

```text
NEXT_PUBLIC_ADSENSE_CONSENT_READY=true
```

### 6. 광고 단위 생성

AdSense에서 반응형 디스플레이 광고 단위를 생성하고 숫자로 된 slot ID를 복사한다.

```text
NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=<숫자 slot ID>
```

초기에는 게임별 하나의 하단 배치만 사용한다.

- 게임판 위 오버레이 금지
- 착수·이동 버튼 주변 배치 금지
- 전체화면 플레이 중 노출 금지
- 게임 진행을 가리는 고정 광고 금지
- 광고임을 명확히 표시

### 7. 마지막으로 광고 활성화

아래가 모두 완료된 뒤 마지막에만 광고를 활성화한다.

```text
ADSENSE_PAYMENT_PROFILE_READY=true
ADSENSE_SITE_ADDED=true
NEXT_PUBLIC_ADSENSE_SITE_APPROVED=true
NEXT_PUBLIC_ADSENSE_CONSENT_READY=true
NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=<숫자 slot ID>
NEXT_PUBLIC_ADSENSE_ENABLED=true
```

배포 후 공식 도메인 감사를 다시 실행한다. `/api/release`에서 다음을 확인한다.

- `monetization.siteApproved: true`
- `monetization.consentReady: true`
- `monetization.slotConfigured: true`
- `monetization.scriptEnabled: true`

## 초기 수익화 KPI

승인 직후에는 광고 수익만 보지 않고 아래 퍼널을 함께 측정한다.

- 검색·직접·추천 유입별 세션 수
- 방문 대비 게임 시작률
- 게임 시작 대비 완료율
- 세션당 게임 수
- 다음 게임 클릭률
- 모바일 전체화면 사용률
- 광고 요청 수와 실제 노출 수
- 페이지 RPM과 세션 RPM
- 광고 도입 전후 게임 이탈률
- 정책 경고·크롤러 오류·ads.txt 상태

광고를 추가한 뒤 게임 완료율이나 다음 게임 전환이 크게 떨어지면 광고 수를 늘리지 않고 위치와 형식을 먼저 조정한다.

## 완료 보고 기준

아래 표현을 구분한다.

- **연결 코드 준비됨**: 메타 태그와 ads.txt가 GitHub에 구현됨
- **공식 도메인 연결 확인됨**: 공식 도메인에서 두 항목이 응답함
- **검토 요청됨**: AdSense 사이트 상태에서 검토 요청이 확인됨
- **승인됨**: AdSense에서 사이트 승인 상태가 확인됨
- **광고 활성화됨**: 공식 도메인의 배포 상태와 광고 스크립트가 일치함
- **첫 수익 확인됨**: AdSense 보고서에서 0보다 큰 추정 수익이 확인됨

앞 단계가 완료됐다고 다음 단계까지 완료된 것으로 보고하지 않는다.
