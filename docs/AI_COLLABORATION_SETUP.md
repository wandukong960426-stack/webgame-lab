# ChatGPT Codex + Claude Code 연결 안내

목표는 두 AI를 서로 직접 연결하는 것이 아니라, 같은 GitHub 저장소·브랜치·PR·자동검사를 사용하게 하는 것이다.

## 이미 준비된 항목

- GitHub 저장소: `wandukong960426-stack/webgame-lab`
- PR 자동검사: TypeScript, Next.js build, smoke test
- Codex 작업 규칙: `AGENTS.md`
- Claude 작업 규칙: `CLAUDE.md`
- 현재 상태: `docs/PROJECT_STATE.md`
- 공동 장부: `docs/AI_HANDOFF.md`

## 사용자가 한 번만 할 일

### 1. Claude Code 설치 및 로그인

Claude Code를 사용할 컴퓨터에서 Anthropic 공식 안내에 따라 설치하고 Claude 계정으로 로그인한다.

### 2. 저장소 내려받기

```bash
git clone https://github.com/wandukong960426-stack/webgame-lab.git
cd webgame-lab
```

이미 내려받았다면 해당 폴더에서 다음만 실행한다.

```bash
git switch main
git pull
```

### 3. GitHub 인증

GitHub CLI를 사용하는 경우:

```bash
gh auth login
gh auth status
```

브라우저가 열리면 `wandukong960426-stack` 계정으로 승인한다. 토큰을 채팅이나 저장소 파일에 붙여 넣지 않는다.

### 4. Claude 시작

저장소 폴더에서 Claude Code를 실행한다. 첫 요청은 다음 문구를 그대로 사용한다.

> CLAUDE.md, docs/PROJECT_STATE.md, docs/SITES_PARITY.md, docs/AI_HANDOFF.md를 순서대로 읽어. 아직 게임 코드는 수정하지 말고, claude/connection-test 브랜치를 만들어 AI_HANDOFF.md에 연결 시험 기록만 추가한 Draft PR을 생성해. main 직접 커밋, 병합, 배포는 하지 마.

### 5. Codex에 검토 요청

Claude가 만든 PR 주소를 ChatGPT에 보내고 다음과 같이 요청한다.

> 이 PR의 diff, 자동검사, 공동작업 규칙 준수 여부를 검토해. 문제 없으면 병합 가능한지 보고하고 직접 병합하거나 배포하지 마.

## 매 작업의 반복 순서

1. GitHub Issue 또는 한 문장으로 작업 목표 확정
2. 담당 AI가 자기 이름의 브랜치 생성
3. `docs/AI_HANDOFF.md`에 Active work 기록
4. 구현과 로컬 검사
5. Draft PR 생성
6. 다른 AI가 코드·UX·회귀 위험 검토
7. 원 담당 AI가 수정
8. 자동검사 통과 확인
9. 사용자가 병합 결정
10. 별도 승인과 검증이 있을 때만 배포

## 브랜치 예시

- `claude/chess-mobile-controls`
- `codex/omok-visual-qa`
- `chore/update-project-state`

## 안전 원칙

- `main`에 직접 작업하지 않는다.
- 공식 도메인은 현재 Sites 운영본이므로 GitHub PR을 배포로 간주하지 않는다.
- Vercel Production과 도메인 설정은 공동작업 연결 시험에서 건드리지 않는다.
- 비밀키는 GitHub Secrets나 호스팅 환경변수에만 둔다.
- 한 AI는 구현하고 다른 AI는 검토하는 방식으로 교차검증한다.
