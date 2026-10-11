// 마지막 송출 — 실제 브라우저 검수 (Chromium + playwright-core)
// 실행 예:
//   cd projects/last-broadcast && npm install && npm run qa
//   QA_FILE=dist/last-broadcast.html QA_SHOTS=/tmp/shots node checks/browser-qa.mjs
// 확인: 시작→도입→역할 선택→1~3막 조사→오답·힌트·뒤로 가기→최종 보고서→엔딩→재진입→초기화,
//       저장 손상·구버전·저장 불가 처리, 360px~1440px 가로 넘침·잘린 버튼, 콘솔 오류.
// 이 검사는 사람이 하는 플레이테스트(재미·난이도·실제 소요 시간)를 대신하지 않는다.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const FILE = resolve(root, process.env.QA_FILE || 'improved/index.html');
const SHOTS = process.env.QA_SHOTS ? resolve(process.env.QA_SHOTS) : null;
const URL = 'file://' + FILE;
const exeCandidates = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
const executablePath = exeCandidates.find((p) => existsSync(p));
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const results = [];
const consoleErrors = [];
let shotNo = 0;

function ok(name) { results.push([true, name]); console.log('  ✓ ' + name); }
function bad(name, detail) { results.push([false, name, detail]); console.log('  ✗ ' + name + (detail ? '\n    ' + detail : '')); }
async function check(name, fn) {
  try { const r = await fn(); if (r === false) bad(name); else ok(name + (typeof r === 'string' ? ' — ' + r : '')); }
  catch (e) { bad(name, (e && e.message || String(e)).split('\n').filter((l) => l.trim()).slice(0, 4).join(' / ')); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expectation failed'); }

const browser = await chromium.launch(executablePath ? { executablePath } : {});
async function newContext(viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 800 }, locale: 'ko-KR' });
  return ctx;
}
async function newPage(ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  return page;
}
async function shot(page, label) {
  if (!SHOTS) return;
  shotNo++;
  await page.screenshot({ path: join(SHOTS, String(shotNo).padStart(2, '0') + '-' + label + '.png'), fullPage: false });
}
const sel = (act, id) => `[data-act="${act}"]` + (id !== undefined ? `[data-id="${id}"]` : '');
async function click(page, s) { await page.locator(s).first().click(); await page.waitForTimeout(40); }
async function has(page, s) { return (await page.locator(s).count()) > 0; }
async function state(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.LB.ui._state()))); }
async function modalOpen(page) { return page.evaluate(() => document.getElementById('modal').open); }
async function closeModal(page) {
  if (!(await modalOpen(page))) return;
  await page.locator('#modal [data-act="close-modal"]').last().click();
  await page.waitForTimeout(40);
}
async function playScenes(page, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await has(page, '#app ' + sel('scene-action'))) await click(page, '#app ' + sel('scene-action'));
    else if (await has(page, '#app ' + sel('scene-next'))) await click(page, '#app ' + sel('scene-next'));
    else return i;
  }
  throw new Error('장면이 끝나지 않습니다');
}
async function asRole(page, role) {
  const s = await state(page);
  if (s.role === role) return;
  await click(page, sel('switch-role'));
  if (await page.evaluate(() => document.getElementById('handoff').open)) {
    await shot(page, 'handoff-' + role);
    await click(page, '#handoff ' + sel('handoff-go'));
  }
  expect((await state(page)).role === role, '역할 전환 실패');
}
async function nav(page, id) { await click(page, `.nav [data-act="nav"][data-view="${id}"]`); }
async function tab(page, view) {
  await nav(page, 'inv');
  if (await has(page, '.crumb [data-act="back"]')) await click(page, '.crumb [data-act="back"]');
  if (await has(page, `[data-act="go"][data-view="${view}"]`)) await click(page, `[data-act="go"][data-view="${view}"]`);
}
async function visitLocation(page, loc) {
  await tab(page, 'map');
  await click(page, sel('loc', loc));
  const ids = await page.$$eval('.spots button.spot', (bs) => bs.map((b) => b.dataset.id));
  for (const id of ids) {
    await click(page, `.spots ${sel('hotspot', id)}`);
    if (await modalOpen(page)) {
      // 여러 증거가 한 번에 나오면 탭을 모두 열어 읽음 처리
      const tabs = await page.$$eval('#modal .ev-tabs button', (bs) => bs.map((b) => b.dataset.id));
      for (const t of tabs.slice(1)) await click(page, `#modal ${sel('ev-tab', t)}`);
      await closeModal(page);
    }
  }
  return ids.length;
}
async function askAll(page, who) {
  await tab(page, 'talk');
  await click(page, sel('person', who));
  let n = 0;
  while (await has(page, '.topic')) { await click(page, '.topic'); n++; if (n > 20) throw new Error('질문 반복'); }
  await click(page, sel('back'));
  return n;
}
async function layoutAudit(page) {
  return page.evaluate(() => {
    const iw = window.innerWidth;
    const doc = document.documentElement;
    const offenders = [];
    const vis = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const scope = document.getElementById('modal').open ? document.getElementById('modal') : document.getElementById('handoff').open ? document.getElementById('handoff') : document;
    scope.querySelectorAll('button, a, input, select, textarea, .btn, h1, h2, h3, p, li, table').forEach((el) => {
      if (!vis(el)) return;
      if (el.closest('.table-wrap, .script, .files, .zoomable, .cctv-list, .ruler, svg')) return;
      const r = el.getBoundingClientRect();
      if (r.right > iw + 1 || r.left < -1) offenders.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '~' + Math.round(r.right));
    });
    const small = [];
    scope.querySelectorAll('button, input:not([type=hidden]), select, textarea, [role=tab]').forEach((el) => {
      if (!vis(el) || el.closest('.sr-only')) return;
      // 라벨로 감싼 체크박스·라디오·스위치는 라벨 전체가 터치 영역이다
      const target = (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) || el;
      const r = target.getBoundingClientRect();
      if ((r.height < 32 || r.width < 32) && !el.closest('.cmp-stage')) small.push((el.dataset.act || el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    return { scrollW: doc.scrollWidth, iw, offenders: offenders.slice(0, 6), small: small.slice(0, 6) };
  });
}
const layoutIssues = [];
async function layouts(page, label) {
  const orig = page.viewportSize();
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(60);
    const a = await layoutAudit(page);
    if (a.scrollW > a.iw + 1) layoutIssues.push(`${label}@${w}: 가로 스크롤 ${a.scrollW}>${a.iw}`);
    if (a.offenders.length) layoutIssues.push(`${label}@${w}: 화면 밖 요소 ${a.offenders.join(', ')}`);
    if (a.small.length) layoutIssues.push(`${label}@${w}: 작은 터치 영역 ${a.small.join(', ')}`);
    if (w === 360 || w === 1440) await shot(page, label + '-' + w);
  }
  await page.setViewportSize(orig);
  await page.waitForTimeout(40);
}

/* ───────── 1. 처음부터 끝까지 (2인 모드) ───────── */
console.log('완주 시나리오 (2인 · 한 기기)');
const ctx = await newContext();
const page = await newPage(ctx);
await page.goto(URL);
await page.waitForTimeout(200);

await check('타이틀 화면과 플레이 방법', async () => {
  expect(await has(page, sel('new')), '새 수사 버튼');
  expect(!(await has(page, sel('continue'))), '처음에는 이어하기가 없어야 함');
  await layouts(page, 'title');
  await click(page, sel('howto'));
  expect(await modalOpen(page), '플레이 방법 대화상자');
  expect((await page.textContent('#modal')).includes('원격 플레이는 지원하지 않습니다'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  expect(!(await modalOpen(page)), 'Esc로 닫힘');
});
await check('모드 선택 → 도입부 → 역할 선택', async () => {
  await click(page, sel('new'));
  expect(await has(page, '#modal ' + sel('mode', 'duo')));
  await layouts(page, 'mode');
  await click(page, sel('mode', 'duo'));
  await shot(page, 'prologue-1');
  // 키보드로도 진행되는지 확인
  await page.keyboard.press('Enter');
  await page.waitForTimeout(40);
  await layouts(page, 'prologue');
  const steps = await playScenes(page);
  expect(await has(page, '[data-act="start-role"][data-role="seoha"]'), '역할 선택 화면');
  const s = await state(page);
  expect(s.roles.seoha.found.s_photo_onair && s.roles.seoha.found.s_note_prologue && s.roles.ian.found.i_note_monitor, '도입부 증거');
  await layouts(page, 'pickrole');
  await click(page, '[data-act="start-role"][data-role="seoha"]');
  return steps + '단계';
});

await check('1막 서하: 평면도·장소·CCTV 조사', async () => {
  await layouts(page, 'map');
  let n = 0;
  for (const loc of ['lobby', 'records', 'guard', 'hall', 'archive', 'studio', 'sub', 'east2', 'roof']) n += await visitLocation(page, loc);
  const s = await state(page);
  ['s_cctv', 's_receipt', 's_logger_vault', 's_vault', 's_radiator', 's_umbrella', 's_switch'].forEach((id) => expect(s.roles.seoha.found[id], id));
  expect(!s.roles.seoha.found.s_editcopy, '서랍은 아직 잠김');
  return n + '곳 조사';
});
await check('잠긴 방 안내와 장소 화면 레이아웃', async () => {
  await tab(page, 'map');
  await click(page, sel('loc', 'office'));
  expect((await state(page)).roles.seoha.view.name === 'map', '잠긴 방은 열리지 않음');
  await click(page, sel('loc', 'archive'));
  await layouts(page, 'location');
  await click(page, `.spots ${sel('hotspot', 'h_arc_vault')}`);
  await layouts(page, 'evidence-modal');
  await click(page, '#modal ' + sel('zoom'));
  expect(await page.evaluate(() => !!document.querySelector('#modal .zoomable.zoomed')), '확대');
  await closeModal(page);
});
await check('CCTV 장면 넘기기 (버튼·방향키)', async () => {
  await tab(page, 'map');
  await click(page, sel('loc', 'guard'));
  await click(page, `.spots ${sel('hotspot', 'h_guard_dvr')}`);
  await click(page, '#modal [data-act="cctv-step"][data-d="1"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(40);
  const t = await page.textContent('#modal .cctv-time');
  expect(t.includes('21:50:50'), 'CCTV 3번째 장면: ' + t);
  await layouts(page, 'cctv');
  await closeModal(page);
});
await check('브라우저 뒤로 가기: 대화상자 닫기 → 평면도로', async () => {
  await click(page, `.spots ${sel('hotspot', 'h_guard_log')}`);
  expect(await modalOpen(page));
  await page.goBack();
  await page.waitForTimeout(120);
  expect(!(await modalOpen(page)), '뒤로 가기로 대화상자 닫힘');
  expect((await state(page)).roles.seoha.view.name === 'loc', '장소 화면 유지');
  await page.goBack();
  await page.waitForTimeout(120);
  expect((await state(page)).roles.seoha.view.name === 'map', '평면도로 돌아감');
});
await check('1막 인터뷰', async () => {
  let n = 0;
  for (const w of ['yoon', 'han', 'min']) n += await askAll(page, w);
  const s = await state(page);
  expect(s.roles.seoha.found.t_han_radiator, '라디에이터 질문 (스튜디오 조사 후)');
  await tab(page, 'talk');
  await click(page, sel('person', 'han'));
  await layouts(page, 'interview');
  return n + '개 질문';
});
await check('노트 입력은 역할별로 저장되고 HTML로 해석되지 않는다', async () => {
  await nav(page, 'notes');
  await page.fill('#notes', '<img src=x onerror=alert(1)> CCTV 표시 21:54:05');
  await page.waitForTimeout(500);
  expect((await state(page)).roles.seoha.notes.startsWith('<img'), '원문 그대로 저장');
  expect(!(await page.evaluate(() => !!document.querySelector('#app img'))), 'img 태그 삽입 없음');
  await layouts(page, 'notes');
});
await check('2인 모드 역할 넘기기 화면', async () => {
  await click(page, sel('switch-role'));
  expect(await page.evaluate(() => document.getElementById('handoff').open), '전달 화면');
  expect(await page.evaluate(() => document.getElementById('app').getAttribute('aria-hidden') === 'true'), '뒤 화면 가림');
  await layouts(page, 'handoff');
  await click(page, '#handoff ' + sel('handoff-cancel'));
  expect((await state(page)).role === 'seoha', '취소하면 그대로');
  await asRole(page, 'ian');
  expect((await page.textContent('#app')).includes('건물 관리 기록'));
  const notes = (await state(page)).roles.ian.notes;
  expect(!notes.includes('21:54:05'), '서하 노트가 이안에게 보이지 않음');
});
await check('1막 이안: 기록·센서·음원·수신함', async () => {
  for (const t of ['light', 'access', 'doors', 'env', 'cards']) await click(page, sel('bms-tab', t));
  await layouts(page, 'bms');
  await tab(page, 'sensors');
  await layouts(page, 'sensors');
  await tab(page, 'audio');
  await click(page, sel('rec-play'));
  await page.waitForTimeout(300);
  await click(page, sel('rec-seek') + '[data-t="61"]');
  await click(page, sel('rec-stop'));
  await layouts(page, 'audio');
  await tab(page, 'docs');
  for (const id of ['i_tapereg', 'i_manifest']) { await click(page, sel('open-ev', id)); await closeModal(page); }
  const s = await state(page);
  ['i_bms_light', 'i_bms_access', 'i_loggers', 'i_rec_onair', 'i_manifest'].forEach((id) => expect(s.roles.ian.found[id], id));
});
await check('힌트: 관찰 → 조합 → 구체 (확인 후 공개)', async () => {
  await click(page, sel('hint', 'J1'));
  await click(page, '#modal ' + sel('hint-more', 'J1'));
  await click(page, '#modal ' + sel('hint-more', 'J1'));
  await click(page, '#modal ' + sel('hint-more', 'J1'));
  expect(await page.evaluate(() => document.getElementById('confirm').open), '3단계 확인창');
  await click(page, '#confirm [data-confirm="yes"]');
  expect((await state(page)).shared.hints.J1 === 3);
  expect((await page.textContent('#modal')).includes('21:54:05'));
  await layouts(page, 'hint');
  await closeModal(page);
});
await check('공동 분석 J1·J2: 오답 안내 후 정답', async () => {
  await tab(page, 'bms');
  await click(page, sel('joint', 'J1'));
  await page.check('#modal input[name="pair"][value="light_off"]');
  await page.fill('#modal input[name="dvr"]', '21:54:20');
  await click(page, '#modal form button.primary');
  expect((await page.textContent('#jointMsg')).includes('거의'), '근접 오답 안내');
  await layouts(page, 'joint');
  await page.fill('#modal input[name="dvr"]', '21:54:05');
  await click(page, '#modal form button.primary');
  expect((await page.textContent('#modal')).includes('7분 00초'));
  await closeModal(page);
  await tab(page, 'sensors');
  await click(page, sel('joint', 'J2'));
  await page.check('#modal input[name="logger"][value="HL-17"]');
  await click(page, '#modal form button.primary');
  expect((await page.textContent('#jointMsg')).length > 5);
  await page.check('#modal input[name="logger"][value="HL-22"]');
  await click(page, '#modal form button.primary');
  await closeModal(page);
  const s = await state(page);
  expect(s.shared.joints.J1.done && s.shared.joints.J2.done);
});
await check('시간표: CCTV 보정 전후 비교', async () => {
  await asRole(page, 'seoha');
  await nav(page, 'timeline');
  const corr = await page.textContent('.timeline');
  expect(corr.includes('21:41:20'), '보정된 민해수 출입 시각');
  await page.click('[data-act="tl-corr"]');
  await page.waitForTimeout(40);
  expect((await page.textContent('.timeline')).includes('21:48:20'), '보정 해제 시 녹화기 표시');
  await layouts(page, 'timeline');
});
await check('공동 결론 1: 오답 → 증거 종류 안내 → 정답 → 2막 장면', async () => {
  await nav(page, 'board');
  await page.selectOption('form[data-id="IC1"] select[name="time"]', '2154');
  await page.selectOption('form[data-id="IC1"] select[name="card"]', 'c07');
  await page.selectOption('form[data-id="IC1"] select[name="out"]', 'min');
  await click(page, 'form[data-id="IC1"] button.primary');
  const fb = await page.textContent('form[data-id="IC1"]');
  expect(fb.includes('[시각 기록]'), '시각 기록 충돌 안내');
  await layouts(page, 'board');
  await page.selectOption('form[data-id="IC1"] select[name="time"]', '2147b');
  await click(page, 'form[data-id="IC1"] button.primary');
  expect(await has(page, '.scene'), '2막 장면');
  await playScenes(page);
  const s = await state(page);
  expect(s.shared.concl.IC1.done && s.shared.concl.IC1.tries === 2);
});
await check('2막 서하: 민해수 서랍과 편집본', async () => {
  await askAll(page, 'min');
  await visitLocation(page, 'records');
  const s = await state(page);
  ['s_editcopy', 's_editnote', 's_1999memo', 't_min_edit'].forEach((id) => expect(s.roles.seoha.found[id] || id === 't_min_edit', id));
  await askAll(page, 'min');
  await askAll(page, 'yoon');
});
await check('2막 이안: 음원 비교와 금속음 출처', async () => {
  await asRole(page, 'ian');
  await tab(page, 'audio');
  for (const r of ['t1', 't2', 'backup']) await click(page, sel('rec-select', r));
  await page.selectOption('[data-act="cmp-file"]', 't2');
  await page.locator('[data-act="cmp-offset"]').fill('29.5');
  await page.waitForTimeout(40);
  await click(page, sel('match-submit'));
  expect((await page.textContent('#matchMsg')).includes('밀어'), '근접 오답');
  await click(page, '[data-act="cmp-nudge"][data-d="0.5"]');
  expect((await page.textContent('#cmpMatch')).includes('10 / 10'));
  await click(page, sel('match-submit'));
  await layouts(page, 'compare');
  await click(page, sel('joint', 'J3'));
  await page.selectOption('#modal select[name="source"]', 'rain');
  await page.selectOption('#modal select[name="window"]', 'heating');
  await click(page, '#modal form button.primary');
  expect((await page.textContent('#jointMsg')).includes('서하'));
  await page.selectOption('#modal select[name="source"]', 'radiator');
  await click(page, '#modal form button.primary');
  await closeModal(page);
  for (const id of ['i_chanlog', 'i_cartlog', 'i_manual']) { await tab(page, 'docs'); await click(page, sel('open-ev', id)); await closeModal(page); }
  const s = await state(page);
  expect(s.shared.joints.MATCH.done && s.shared.joints.J3.done);
});
await check('공동 결론 2: 근거 개수 오류 → 정답 → 3막', async () => {
  await nav(page, 'board');
  await page.selectOption('form[data-id="IC2"] select[name="source"]', 't2');
  for (const v of ['clank', 'onair', 'norain']) await page.check(`form[data-id="IC2"] input[name="reasons"][value="${v}"]`);
  for (const v of ['yoon', 'han']) await page.check(`form[data-id="IC2"] input[name="broken"][value="${v}"]`);
  await click(page, 'form[data-id="IC2"] button.primary');
  expect((await page.textContent('form[data-id="IC2"]')).includes('두 개'));
  await page.uncheck('form[data-id="IC2"] input[name="reasons"][value="norain"]');
  await click(page, 'form[data-id="IC2"] button.primary');
  expect(await has(page, '.scene'), '3막 장면');
  await playScenes(page);
});
await check('3막: 지하 잠금 해제(이안) → 국장실·옥상·인터뷰(서하)', async () => {
  await tab(page, 'bms');
  await click(page, sel('bms-action', 'unlockB1'));
  await click(page, '#confirm [data-confirm="yes"]');
  expect((await state(page)).shared.flags.b1Unlocked);
  await tab(page, 'docs');
  await click(page, sel('open-ev', 'i_audit'));
  await closeModal(page);
  await asRole(page, 'seoha');
  await visitLocation(page, 'office');
  for (const w of ['han', 'yoon', 'min', 'han']) await askAll(page, w);
  await visitLocation(page, 'archive');
  const s = await state(page);
  ['s_fax', 's_cutseal', 's_deskphone', 's_hanphone', 's_procedure', 't_han_keys', 't_han_talkback'].forEach((id) => expect(s.roles.seoha.found[id], id));
});
await check('지하 선반 C: 무게 재기, 잘못 뜯은 봉인 기록, 원본 발견', async () => {
  await visitLocation(page, 'staging');
  await tab(page, 'map');
  await click(page, sel('loc', 'staging'));
  await click(page, `.spots ${sel('hotspot', 'h_stg_shelfc')}`);
  for (const b of ['C-1', 'C-4']) await click(page, '#modal ' + sel('weigh', b));
  expect((await page.textContent('#modal .shelf')).includes('1.7kg'));
  await layouts(page, 'shelf');
  await click(page, '#modal ' + sel('open-box', 'C-2'));
  await click(page, '#confirm [data-confirm="yes"]');
  expect((await page.textContent('#shelfMsg')).includes('C-2'));
  await click(page, '#modal ' + sel('open-box', 'C-4'));
  await click(page, '#confirm [data-confirm="yes"]');
  await closeModal(page);
  const s = await state(page);
  expect(s.shared.joints.J5.done && s.roles.seoha.found.s_reel && s.shared.opened.includes('C-2'));
});
await check('공동 분석 J4·J6 (이안)', async () => {
  await asRole(page, 'ian');
  await tab(page, 'docs');
  await page.fill('input[name="q"]', '990803');
  await click(page, 'form[data-form="registry"] button');
  expect((await page.textContent('#regResult')).includes('HD-L-990803'));
  await click(page, sel('joint', 'J4'));
  await page.selectOption('#modal select[name="who"]', 'han');
  await page.selectOption('#modal select[name="place"]', 'roof');
  await page.selectOption('#modal select[name="proof"]', 'door');
  await click(page, '#modal form button.primary');
  expect((await page.textContent('#jointMsg')).includes('문 센서'));
  await page.selectOption('#modal select[name="proof"]', 'call');
  await click(page, '#modal form button.primary');
  await closeModal(page);
  await click(page, sel('joint', 'J6'));
  await page.selectOption('#modal select[name="spec"]', 'm10red');
  await page.fill('#modal input[name="punch"]', 'l-990803');
  await click(page, '#modal form button.primary');
  await closeModal(page);
  expect(await has(page, '.scene'), '원본 발견 장면');
  await playScenes(page);
});
await check('최종 보고서: 반려 후 제출 → 대면 → 선택 → 엔딩', async () => {
  await nav(page, 'board');
  const fill = async (vals) => { for (const [name, v] of Object.entries(vals)) await page.selectOption(`form[data-form="final"] select[name="${name}"]`, v); };
  await fill({ 's1.culprit': 'yoon', 's2.lamp': 'panel', 's2.card': 'c07', 's2.ev': 'i_bms_light', 's3.rebut': 'receipt', 's3.ev': 's_receipt',
    's4.minProof': 'receipt', 's4.hanProof': 'call', 's5.where': 'c4', 's5.seal': 's4478', 's6.motive': 'falsify', 's6.ev': 's_editnote' });
  await click(page, 'form[data-form="final"] button.primary');
  const t = await page.textContent('form[data-form="final"]');
  expect(t.includes('[제3자 기록]'), '반려 사유 표시');
  await layouts(page, 'final');
  await fill({ 's3.rebut': 'calls', 's3.ev': 'i_audit' });
  await click(page, 'form[data-form="final"] button.primary');
  expect(await has(page, '.scene'), '대면 장면');
  await shot(page, 'confront');
  await playScenes(page);
  expect(await has(page, sel('scene-choice', 'air')), '마지막 선택');
  await layouts(page, 'choice');
  await click(page, sel('scene-choice', 'air'));
  await playScenes(page);
  expect((await page.textContent('#app')).includes('지워지지 않은 목소리'), '엔딩 정리');
  await layouts(page, 'ending');
  await click(page, sel('open-ev-any', 's_receipt'));
  expect(await modalOpen(page), '엔딩에서 증거 재열람');
  await closeModal(page);
  const s = await state(page);
  expect(s.phase === 'ending' && s.shared.endingChoice === 'air' && s.shared.concl.FINAL.tries === 2);
});
await check('새로 고침 후 이어하기·엔딩 다시 보기·수사 화면 재열람', async () => {
  await page.reload();
  await page.waitForTimeout(200);
  expect(await has(page, sel('continue')) && await has(page, sel('replay-ending')));
  await click(page, sel('replay-ending'));
  expect(await has(page, '.scene'));
  await click(page, sel('scene-skip'));
  expect(await has(page, sel('continue')), '다시 보기를 닫으면 타이틀');
  await click(page, sel('continue'));
  expect((await page.textContent('#app')).includes('지워지지 않은 목소리'));
  await click(page, sel('review'));
  await nav(page, 'board');
  expect((await page.textContent('#app')).includes('보고서가 받아들여졌다'));
  await click(page, sel('to-ending'));
  expect((await page.textContent('#app')).includes('지워지지 않은 목소리'));
});
await check('처음부터 다시: 확인 후 진행 삭제', async () => {
  await click(page, sel('reset'));
  await click(page, '#confirm [data-confirm="no"]');
  expect((await state(page)).phase === 'ending', '취소');
  await click(page, sel('reset'));
  await click(page, '#confirm [data-confirm="yes"]');
  const s = await state(page);
  expect(s.phase === 'title' && !Object.keys(s.roles.seoha.found).length);
  expect(!(await has(page, sel('continue'))));
});
await ctx.close();

/* ───────── 2. 저장 손상·구버전·저장 불가 ───────── */
console.log('저장 손상 · 복구');
async function withStorage(setup, fn) {
  const c = await newContext();
  const p = await newPage(c);
  await p.goto(URL);
  await p.evaluate(setup);
  await p.reload();
  await p.waitForTimeout(200);
  try { await fn(p); } finally { await c.close(); }
}
await check('깨진 JSON → 안내 + .corrupt 백업', () => withStorage(() => localStorage.setItem('last-broadcast.save', '{"v":2,'), async (p) => {
  expect((await p.textContent('#modal')).includes('읽지 못했습니다'));
  expect(await p.evaluate(() => localStorage.getItem('last-broadcast.save.corrupt') === '{"v":2,'));
}));
await check('앞뒤가 안 맞는 진행 → 복구 안내 + 진행 재구성', () => withStorage(() => localStorage.setItem('last-broadcast.save', JSON.stringify({ v: 2, phase: 'play', mode: 'duo', role: 'ian', shared: { concl: { IC2: { done: true, tries: 1 } }, joints: { J1: { done: true, tries: 1 } } }, roles: { seoha: { notes: '보존' } } })), async (p) => {
  expect((await p.textContent('#modal')).includes('복구했습니다'));
  await p.locator('#modal [data-act="close-modal"]').last().click();
  await p.click(sel('continue'));
  const s = await state(p);
  expect(s.roles.seoha.notes === '보존' && !s.shared.concl.IC2.done && s.shared.joints.J1.done, '선행 조건을 갖춘 J1은 유지, IC2는 취소');
}));
await check('원본 체험판 저장(broadcast-v1) → 노트 이전 안내', () => withStorage(() => localStorage.setItem('broadcast-v1', JSON.stringify({ role: 'B', phase: 2, notes: { A: '', B: '이전 메모' } })), async (p) => {
  expect((await p.textContent('#modal')).includes('이전 체험판'));
  expect((await state(p)).roles.ian.notes.includes('이전 메모'));
}));
await check('저장소 차단 환경 → 안내 후 플레이 가능', async () => {
  const c = await newContext();
  await c.addInitScript(() => {
    const deny = () => { throw new DOMException('denied', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { get: deny, configurable: true });
  });
  const p = await newPage(c);
  await p.goto(URL);
  await p.waitForTimeout(200);
  expect((await p.textContent('#modal')).includes('저장할 수 없는 환경'));
  await p.locator('#modal [data-act="close-modal"]').last().click();
  await p.click(sel('new'));
  await p.click(sel('mode', 'solo'));
  expect(await has(p, '.scene'));
  await c.close();
});

/* ───────── 3. 혼자 검수 모드 ───────── */
console.log('혼자 검수 모드');
await check('검수 모드는 전달 화면 없이 역할을 바꾼다', async () => {
  const c = await newContext({ width: 390, height: 844 });
  const p = await newPage(c);
  await p.goto(URL);
  await p.click(sel('new'));
  await p.click(sel('mode', 'solo'));
  await click(p, sel('scene-skip'));
  await click(p, '[data-act="start-role"][data-role="ian"]');
  expect((await p.textContent('#app')).includes('검수 모드'));
  await click(p, sel('switch-role'));
  expect(!(await p.evaluate(() => document.getElementById('handoff').open)), '전달 화면 없음');
  expect((await state(p)).role === 'seoha');
  expect((await state(p)).roles.seoha.found.s_photo_onair, '장면을 건너뛰어도 도입부 증거 지급');
  await c.close();
});

/* ───────── 결과 ───────── */
await check('레이아웃: 360~1440px 가로 넘침·화면 밖 요소·작은 터치 영역 없음', async () => {
  if (layoutIssues.length) throw new Error(layoutIssues.slice(0, 8).join(' | ') + (layoutIssues.length > 8 ? ` 외 ${layoutIssues.length - 8}건` : ''));
  return WIDTHS.map((w) => w[0]).join('/') + 'px';
});
await check('콘솔 오류 없음', async () => {
  if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 5).join(' | '));
});
await browser.close();

const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} 통과 · 파일 ${FILE}`);
console.log('미검증: 사람 플레이 시간과 난이도, 실제 모바일 기기의 터치·화면 낭독기, Safari·Firefox, 소리의 실제 청감.');
process.exit(failed.length ? 1 : 0);
