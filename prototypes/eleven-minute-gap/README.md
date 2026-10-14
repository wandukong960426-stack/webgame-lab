# 11분의 공백 · 독립 HTML 검수본

추리형 재판 게임 `11분의 공백`의 단일 파일 HTML 검수본이다.

- `index.html` 하나에 이미지(WebP, base64)와 코드가 모두 들어 있어 인터넷 연결 없이 브라우저에서 바로 열 수 있다.
- 이 폴더는 Next.js 앱의 `app/`·`public/` 밖에 있으므로 빌드·배포 대상이 아니다. 공식 도메인이나 Preview에 노출되지 않는다.
- 저장은 브라우저 `localStorage`의 `ttanjitmoa-design-review-20261014-v1*` 키를 사용한다.

## 확인 방법

```bash
# 파일을 직접 열거나
open prototypes/eleven-minute-gap/index.html
# 정적 서버로 연다
npx serve prototypes/eleven-minute-gap
```

하단 검수 바의 1–8 화면 이동, `원본 시안`, `검수 메모`로 화면별 검수를 진행한다.
