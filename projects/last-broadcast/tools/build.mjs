// 마지막 송출 — 단일 HTML 실행본 만들기 (Node 내장 모듈만 사용)
// 실행: node projects/last-broadcast/tools/build.mjs
// 결과: projects/last-broadcast/dist/last-broadcast.html  (설치 없이 더블클릭으로 연다)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'improved');
const outDir = join(here, '..', 'dist');
let html = readFileSync(join(src, 'index.html'), 'utf8');

// </script>가 본문에 섞여 실행본이 깨지는 일을 막는다
const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = readFileSync(join(src, href), 'utf8');
  return `<style>\n${css.replace(/<\/style/gi, '<\\/style')}\n</style>`;
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, file) => {
  const js = readFileSync(join(src, file), 'utf8');
  return `<script>\n/* ${file} */\n${safeScript(js)}\n</script>`;
});
if (/<script src=|<link rel="stylesheet"/.test(html)) throw new Error('외부 파일 참조가 남아 있습니다.');

mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'last-broadcast.html');
writeFileSync(out, html);
console.log(`built ${out} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
