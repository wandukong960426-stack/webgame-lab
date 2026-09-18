# 딴짓모아 프로젝트 상태

최종 갱신: 2026-09-18

## 현재 기준점

| 구분 | 현재 상태 |
|---|---|
| 공식 도메인 | `https://ttanjitmoa.com` |
| 실제 운영본 | ChatGPT Sites 계열 |
| GitHub 저장소 | `wandukong960426-stack/webgame-lab` |
| GitHub 코드 | 별도 Next.js 16 버전 |
| 기본 브랜치 | `main` |
| 자동 검증 | PR에서 TypeScript, Production build, smoke test |
| 운영 전환 승인 | 없음 |
| GitHub를 Production으로 간주 | 금지 |

## 운영본과 GitHub의 차이

상세 비교는 `docs/SITES_PARITY.md`를 기준으로 한다.

현재 확인된 핵심 차이는 다음과 같다.

- Sites 운영본: 8종 게임, 오늘의 도전, 전술 36문제, 게임 가이드, 6개 언어
- GitHub 버전: Next.js 기반 6종 게임
- GitHub 버전에는 미니 스도쿠, 지뢰찾기, 오늘의 도전, 전술 콘텐츠, 완전한 다국어 동등성이 아직 없다.
- 기능 이관과 공식 도메인 전환이 끝나기 전에는 두 코드베이스를 같은 제품 상태로 보고하지 않는다.

## 공동개발 목표

ChatGPT Codex와 Claude Code가 GitHub를 공동 작업 기준점으로 사용한다.

- Codex: 제품·UX·QA·SEO·수익화 검토와 교차검증
- Claude: 기능 구현·리팩터링·성능 개선과 1차 검증
- 역할은 작업별로 바꿀 수 있으나, 동일 파일의 동시 수정은 피한다.
- 모든 변경은 브랜치 → PR → 자동검사 → 사람의 병합 순서를 따른다.
- AI가 직접 공식 Production을 배포하지 않는다.

## 다음 단계

1. 공동작업 규칙 PR을 검토·병합한다.
2. Claude Code에 GitHub 저장소 접근 권한을 연결한다.
3. 첫 시험 작업을 문서 전용 PR로 실행한다.
4. 두 AI의 PR 생성·검토·수정 순환이 정상인지 확인한다.
5. Sites 운영본 전체 인벤토리와 기능 이관 계획을 확정한다.
6. 동등성·롤백 리허설 후에만 공식 도메인 전환을 검토한다.

## 절대 금지

- 기존 Sites 운영본을 사전 검증 없이 GitHub/Vercel 버전으로 교체
- 다른 AI가 진행 중인 파일을 무단 덮어쓰기
- 테스트 실패 상태에서 병합
- 비밀키 커밋
- Preview 또는 GitHub 상태를 공식 도메인 배포로 오인
