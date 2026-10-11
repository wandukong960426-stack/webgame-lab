/*
 * 마지막 송출 — 엔진·데이터 검사 (Node 내장 모듈만 사용)
 * 실행: node projects/last-broadcast/checks/engine.test.cjs
 * 브라우저 화면은 검사하지 않는다. 화면 검수는 browser-qa.mjs가 맡는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..', 'improved', 'js');
function load() {
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['case-data.js', 'engine.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.LB;
}
const LB = load();
const C = LB.CASE, E = LB.engine, U = LB.util;

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (err) { failures.push(name); console.log('  ✗ ' + name + '\n    ' + (err && err.stack || String(err)).split("\n").slice(0, 8).join("\n    ")); }
}
/* vm 컨텍스트의 배열·객체는 프로토타입이 달라 deepStrictEqual 대신 JSON으로 비교한다 */
function eq(a, b, msg) { assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg); }
const IC_OK = {
  IC1: { time: '2147b', card: 'c07', out: 'min' },
  IC2: { source: 't2', reasons: ['clank', 'onair'], broken: ['yoon', 'han'] }
};
function memStore(init) {
  const data = Object.assign({}, init || {});
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; } };
}

/* 정답 경로를 사람처럼 따라가는 탐색기: 열린 것을 모두 조사한 뒤 분석·결론을 푼다 */
function exploreAll(s) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const lid of Object.keys(C.locations)) {
      if (!E.locationUnlocked(s, lid)) continue;
      for (const h of C.locations[lid].hotspots) {
        if (E.hotspotUnlocked(s, h.id) && !s.roles.seoha.examined[h.id]) { E.examine(s, h.id); changed = true; }
      }
    }
    for (const t of C.topics) if (E.topicUnlocked(s, t.id) && !E.hasFound(s, t.id)) { E.ask(s, t.id); changed = true; }
    for (const t of C.stations.bms.tabs) if (E.openRecord(s, t.ev).length) changed = true;
    if (E.openRecord(s, 'i_loggers').length) changed = true;
    for (const it of E.audioLibrary(s)) if (E.openRecord(s, it.ev).length) changed = true;
    for (const it of C.stations.docs.items) if (E.stationItemUnlocked(s, it) && E.openRecord(s, it.ev).length) changed = true;
  }
}
function needsMet(s, id) {
  const j = C.joints[id];
  return ['seoha', 'ian'].every(r => (j.needs[r] || []).every(ev => E.hasFound(s, ev)));
}
const CORRECT = {
  J1: { pair: 'light_off', dvr: '21:54:05' }, J2: { logger: 'HL-22' }, J3: { source: 'radiator', window: 'heating' },
  MATCH: { rec: 't2', offset: 30 }, J4: { who: 'han', place: 'roof', proof: 'call' }, J5: { box: 'C-4' }, J6: { spec: 'm10red', punch: 'L-990803' }
};
const FINAL_OK = {
  s1: { culprit: 'yoon' }, s2: { lamp: 'panel', card: 'c07', ev: 'i_bms_light' }, s3: { rebut: 'calls', ev: 'i_audit' },
  s4: { minProof: 'receipt', hanProof: 'call' }, s5: { where: 'c4', seal: 's4478' }, s6: { motive: 'falsify', ev: 's_editnote' }
};

console.log('데이터 무결성');
test('모든 증거 참조가 실제 증거를 가리킨다', () => {
  const ids = new Set(Object.keys(E.EV));
  const refs = [];
  Object.values(C.locations).forEach(l => l.hotspots.forEach(h => (h.grants || []).forEach(g => refs.push(['hotspot ' + h.id, g]))));
  C.topics.forEach(t => (t.grants || []).forEach(g => refs.push(['topic ' + t.id, g])));
  Object.entries(C.joints).forEach(([id, j]) => { ['seoha', 'ian'].forEach(r => (j.needs[r] || []).forEach(g => refs.push(['joint ' + id, g]))); (j.grants || []).forEach(g => refs.push(['joint ' + id, g])); });
  C.conclusions.FINAL.sentences.forEach(s => s.fields.filter(f => f.evidence).forEach(f => f.accept.forEach(g => refs.push(['final ' + s.id, g]))));
  Object.values(C.scenes).forEach(beats => beats.forEach(b => b.action && Object.values(b.action.grant).flat().forEach(g => refs.push(['scene', g]))));
  C.stations.bms.tabs.forEach(t => refs.push(['bms', t.ev]));
  C.stations.docs.items.forEach(t => refs.push(['docs', t.ev]));
  const bad = refs.filter(([, g]) => !ids.has(g));
  eq(bad, []);
});
test('조건식이 존재하는 증거·분석·결론만 참조한다', () => {
  const bad = [];
  function walk(c, where) {
    if (!c) return;
    if (c.all) c.all.forEach(x => walk(x, where)); if (c.any) c.any.forEach(x => walk(x, where)); if (c.not) walk(c.not, where);
    if (c.found && !E.EV[c.found]) bad.push(where + ':' + c.found);
    if (c.asked && !E.EV[c.asked]) bad.push(where + ':' + c.asked);
    if (c.joint && !C.joints[c.joint]) bad.push(where + ':' + c.joint);
    if (c.concl && !C.conclusions[c.concl]) bad.push(where + ':' + c.concl);
  }
  Object.values(C.locations).forEach(l => { walk(l.unlock, 'loc'); l.hotspots.forEach(h => walk(h.unlock, h.id)); });
  C.topics.forEach(t => walk(t.unlock, t.id));
  Object.values(C.objectives).flat().forEach(o => walk(o.done, o.id));
  C.stations.docs.items.forEach(i => walk(i.unlock, i.ev));
  Object.values(C.conclusions).forEach(c => (c.requires || []).forEach(r => walk(r, 'concl')));
  Object.entries(C.scenes).forEach(([id, beats]) => beats.forEach(b => b.lines.forEach(l => walk(l[2], 'scene ' + id))));
  eq(bad, []);
});
test('엔딩 장면의 사실 대사는 플레이 중 얻는 증거에 묶여 있다', () => {
  const lines = C.scenes.confront[0].lines;
  ['s_1999memo', 's_editnote', 't_han_talkback'].forEach(id => assert.ok(lines.some(l => l[2] && JSON.stringify(l[2]).includes(id)), id));
  // 조건이 없는 사실 대사는 최종 보고서로 확정된 내용만 담는다
  const free = lines.filter(l => !l[2] && l[0] !== 'narr').map(l => l[1]).join(' ');
  ['36분', '02:07', '토크백', '가짜 팩스'].forEach(w => assert.ok(!free.includes(w), '조건 없이 나오는 대사에 ' + w));
});
test('모든 목표에 3단계 힌트가 있다', () => {
  Object.values(C.objectives).flat().forEach(o => { assert.ok(C.hints[o.id], o.id); assert.strictEqual(C.hints[o.id].length, 3, o.id); });
});
test('협동 분석은 두 역할의 자료를 모두 요구한다 (혼자 하는 음원 대조 제외)', () => {
  const one = Object.entries(C.joints).filter(([id, j]) => !j.solo && (!j.needs.seoha.length || !j.needs.ian.length)).map(([id]) => id);
  eq(one, []);
  const coop = Object.entries(C.joints).filter(([, j]) => !j.solo).length;
  assert.ok(coop >= 3, '공간 정보 + 기술 기록 결합 구간이 3개 이상이어야 한다: ' + coop);
  Object.entries(C.joints).forEach(([id, j]) => ['seoha', 'ian'].forEach(r => j.needs[r].forEach(ev => assert.strictEqual(E.EV[ev].owner, r, id + ' ' + ev))));
});
test('원본 매체 표기가 하나로 통일되어 있다 (카세트 표기 없음)', () => {
  const txt = fs.readFileSync(path.join(ROOT, 'case-data.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'art.js'), 'utf8');
  assert.ok(!/카세트|cassette|MASTER TAPE/i.test(txt));
  assert.ok(txt.includes('10.5인치 금속 릴'));
});
test('시각 데이터가 서로 맞는다 (CCTV 7분 오차, 조명·출입·센서)', () => {
  const off = C.joints.J1.offsetSec;
  assert.strictEqual(off, 420);
  const dvr = C.cctv.map(k => U.toSec(k.t) - off).map(s => U.fmt(s));
  ['21:41:20', '21:43:50', '21:47:05', '21:47:30', '21:48:30', '21:49:10', '22:04:10'].forEach(t => assert.ok(dvr.includes(t) || t === '21:47:20', '보정 CCTV에 ' + t));
  const rows = id => E.EV[id].log.rows.map(r => r[0]);
  ['21:47:05', '21:49:10'].forEach(t => assert.ok(rows('i_bms_light').includes(t)));
  ['21:41:20', '21:43:50', '21:47:30', '21:48:30', '22:04:10'].forEach(t => assert.ok(rows('i_bms_access').includes(t)));
  const hl22 = C.loggers.list.find(l => l.id === 'HL-22').events.map(e => e.at);
  eq(hl22, ['21:30:10', '21:47:50', '22:04:30']);
  // 금고 개방은 #07 출입(21:47:30) 뒤, 퇴실(21:48:30) 전
  assert.ok(U.toSec('21:47:50') > U.toSec('21:47:30') && U.toSec('21:47:50') < U.toSec('21:48:30'));
  // 민해수의 택배 서명은 그 사이에 접수실에서 이루어졌다
  assert.ok(U.toSec('21:48:15') > U.toSec('21:47:30') && U.toSec('21:48:15') < U.toSec('21:48:30'));
  // 한도윤 통화는 금고 개방 전후를 덮는다
  assert.ok(U.toSec('21:44:40') < U.toSec('21:47:50') && U.toSec('21:48:55') > U.toSec('21:48:30'));
  // 송출 녹음 = T2를 30초 뒤로
  eq(E.compareMarkers('onair', 't2', 30), { matched: 10, total: 10 });
  assert.ok(E.compareMarkers('onair', 't1', 30).matched < 10);
  for (let o = 0; o <= 60; o += 0.5) if (o !== 30) assert.ok(E.compareMarkers('onair', 't2', o).matched < 10, 'offset ' + o);
  // 라디에이터 41초 주기
  const cl = C.markers.t2.filter(m => m[1] === 'clank').map(m => m[0]);
  cl.slice(1).forEach((t, i) => assert.strictEqual(t - cl[i], 41));
  // 무게: C-4만 목록과 다르다
  const man = Object.fromEntries(E.EV.i_manifest.log.rows.map(r => [r[0], { w: parseFloat(r[2]), seal: r[3] }]));
  const diff = C.boxes.filter(b => man[b.id].w !== b.weight || man[b.id].seal !== b.seal).map(b => b.id);
  eq(diff, ['C-4']);
});

console.log('진행 · 도달 가능성');
test('정답 경로: 각 분석과 결론에 필요한 증거를 제출 전에 모두 얻을 수 있다', () => {
  const s = E.newState(); s.phase = 'play'; s.mode = 'duo';
  C.scenes.prologue.forEach(b => b.action && E.grantSpec(s, b.action.grant));
  const order = [['J1', 'J2'], ['IC1'], ['J3', 'MATCH'], ['IC2'], ['J4', 'J5'], ['J6'], ['FINAL']];
  const before = {};
  for (const group of order) {
    exploreAll(s);
    if (group[0] === 'IC2' || group[0] === 'J4') {
      if (!s.shared.flags.b1Unlocked && E.runAction(s, 'unlockB1').ok) exploreAll(s);
    }
    for (const id of group) {
      if (C.joints[id]) {
        assert.ok(E.jointAvailable(s, id), id + ' 열림');
        assert.ok(needsMet(s, id), id + ' 필요 증거: ' + JSON.stringify(C.joints[id].needs));
        const r = E.submitJoint(s, id, CORRECT[id]);
        assert.ok(r.ok, id + ' 정답 ' + JSON.stringify(r.msgs));
        exploreAll(s);
      } else {
        before[id] = Object.assign({}, s.roles.seoha.found, s.roles.ian.found);
        const r = E.submitConclusion(s, id, id === 'FINAL' ? FINAL_OK : IC_OK[id]);
        assert.ok(r.ok, id + ' 정답 ' + JSON.stringify(r.results.filter(x => !x.ok)));
        E.finishScene(s, s.pending[0]);
      }
    }
  }
  const need = {
    IC1: ['s_cctv', 's_logger_vault', 's_receipt', 'i_bms_access', 'i_bms_light', 'i_loggers', 's_note_prologue'],
    IC2: ['s_radiator', 't_han_radiator', 's_photo_onair', 's_notice', 'i_chanlog', 'i_manual', 'i_rec_t2', 'i_cartlog', 's_soundproof', 's_editnote'],
    FINAL: ['i_audit', 's_deskphone', 's_hanphone', 's_umbrella', 's_procedure', 's_cutseal', 's_switch', 's_keybox', 's_boxes', 's_ledger', 's_scrap', 's_reel', 's_editnote', 't_min_edit', 't_han_keys', 'i_manifest']
  };
  for (const [k, list] of Object.entries(need)) list.forEach(ev => assert.ok(before[k][ev], k + ' 제출 전 ' + ev));
  assert.strictEqual(s.phase, 'ending');
  assert.ok(s.pending.includes('confront') || s.seen.confront);
});
test('중간 결론이 새 자료를 연다 (최소 두 번의 의미 전환)', () => {
  const s = E.newState();
  exploreAll(s);
  const act1 = new Set([...Object.keys(s.roles.seoha.found), ...Object.keys(s.roles.ian.found)]);
  ['t_min_box', 's_editcopy', 'i_rec_t2', 'i_cartlog'].forEach(id => assert.ok(!act1.has(id), '1막에서 ' + id + '가 열리면 안 된다'));
  ['s_fax', 's_cutseal', 'i_audit', 's_hanphone', 's_reel'].forEach(id => assert.ok(!act1.has(id), '1막에서 ' + id));
  assert.ok(!E.locationUnlocked(s, 'office') && !E.locationUnlocked(s, 'staging'));
});
test('한쪽 역할만으로는 결론 1에 필요한 자료가 모이지 않는다', () => {
  const s = E.newState();
  for (const lid of Object.keys(C.locations)) if (E.locationUnlocked(s, lid)) C.locations[lid].hotspots.forEach(h => E.examine(s, h.id));
  assert.ok(!E.hasFound(s, 'i_bms_light') && !E.hasFound(s, 'i_loggers'), '서하 조사만으로 이안 기록이 생기지 않는다');
  ['s_cctv', 's_logger_vault', 's_receipt'].forEach(id => assert.ok(E.hasFound(s, id)));
  assert.ok(!E.conclAvailable(s, 'IC1'));
});

console.log('채점과 피드백');
function stateAt(stage) {
  const s = E.newState(); s.phase = 'play'; s.mode = 'solo';
  exploreAll(s);
  const steps = ['J1', 'J2', 'IC1', 'J3', 'MATCH', 'IC2', 'J4', 'J5', 'J6'];
  for (const id of steps) {
    if (id === stage) break;
    if (C.joints[id]) E.submitJoint(s, id, CORRECT[id]); else E.submitConclusion(s, id, IC_OK[id]);
    if (id === 'IC2') E.runAction(s, 'unlockB1');
    while (s.pending.length) E.finishScene(s, s.pending[0]);
    exploreAll(s);
  }
  return s;
}
test('영상 시각 보정: 초 누락·근접·무관한 값에 서로 다른 안내', () => {
  const s = stateAt('J1');
  let r = E.submitJoint(s, 'J1', { pair: 'light_off', dvr: '21:54' }); assert.ok(!r.ok && /초까지/.test(r.msgs[0]));
  r = E.submitJoint(s, 'J1', { pair: 'light_off', dvr: '21:54:20' }); assert.ok(!r.ok && /거의/.test(r.msgs[0]));
  r = E.submitJoint(s, 'J1', { pair: 'light_off', dvr: '21:40:00' }); assert.ok(!r.ok && /이르게/.test(r.msgs[0]));
  r = E.submitJoint(s, 'J1', { pair: 'card02', dvr: '214820' }); assert.ok(r.ok, '다른 사건 쌍도 같은 오차면 정답');
  assert.strictEqual(s.shared.joints.J1.tries, 4);
});
test('기록계 지정: 오답별 안내, 정답 후 금고 개방 시각 공유', () => {
  const s = stateAt('J2');
  let r = E.submitJoint(s, 'J2', { logger: 'HL-17' }); assert.ok(!r.ok && /문이 열릴 때마다/.test(r.msgs[0]));
  r = E.submitJoint(s, 'J2', { logger: 'hl 22' }); assert.ok(r.ok);
  assert.ok(E.factsUnlocked(s).includes('F_vault'));
});
test('결론 1은 공동 분석 전에는 잠겨 있다', () => {
  const s = E.newState(); exploreAll(s);
  assert.strictEqual(E.submitConclusion(s, 'IC1', IC_OK.IC1).locked, true);
});
test('오답 피드백은 정답 선택지를 드러내지 않는다', () => {
  for (const id of ['IC1', 'IC2']) {
    const c = C.conclusions[id];
    c.fields.forEach(f => {
      const ans = [].concat(c.answer[f.id]);
      const ansLabels = f.options.filter(o => ans.includes(o[0])).map(o => o[1]);
      const fb = c.feedback[f.id] || {};
      Object.values(fb).forEach(msg => ansLabels.forEach(lbl => assert.ok(!msg.includes(lbl), id + '.' + f.id + ' 피드백에 정답 "' + lbl + '"')));
    });
  }
  Object.values(C.conclusions.FINAL.feedback).forEach(msg => {
    ['윤서진', '#07', 'C-4', 'S-4478', '스위치반', '택배', '감사팀'].forEach(w => assert.ok(!msg.includes(w), '최종 피드백에 ' + w));
  });
});
test('결론 1 오답은 증거 종류를 알려 주고, 정답이면 2막으로 넘어간다', () => {
  const s = stateAt('IC1');
  let r = E.submitConclusion(s, 'IC1', { time: '2154', card: 'c02', out: 'han' });
  assert.ok(!r.ok);
  const msgs = r.results.filter(x => !x.ok).map(x => x.msg);
  assert.strictEqual(msgs.length, 3);
  assert.ok(msgs.every(m => /^\[.+\]/.test(m)), '카테고리 표시: ' + msgs.join(' / '));
  assert.strictEqual(E.act(s), 1);
  r = E.submitConclusion(s, 'IC1', IC_OK.IC1);
  assert.ok(r.ok); assert.strictEqual(E.act(s), 2); assert.ok(s.pending.includes('act2'));
});
test('결론 2: 근거는 정확히 두 개, 틀린 근거와 빠진 사람을 구분한다', () => {
  const s = stateAt('IC2');
  let r = E.submitConclusion(s, 'IC2', { source: 't2', reasons: ['clank', 'onair', 'cough'], broken: ['yoon', 'han'] });
  assert.ok(/두 개/.test(r.results.find(x => x.field === 'reasons').msg));
  r = E.submitConclusion(s, 'IC2', { source: 't2', reasons: ['clank', 'norain'], broken: ['yoon'] });
  assert.ok(/공간/.test(r.results.find(x => x.field === 'reasons').msg));
  assert.ok(/모두/.test(r.results.find(x => x.field === 'broken').msg));
  r = E.submitConclusion(s, 'IC2', { source: 't2', reasons: ['cough', 'onair'], broken: ['han', 'yoon'] });
  assert.ok(r.ok);
});
test('상자 열기: 잘못 연 상자는 기록되고 정답 상자는 릴을 준다', () => {
  const s = stateAt('J5');
  let r = E.submitJoint(s, 'J5', { box: 'C-2' }); assert.ok(!r.ok); eq(s.shared.opened, ['C-2']);
  r = E.submitJoint(s, 'J5', { box: 'C-2' }); eq(s.shared.opened, ['C-2']);
  r = E.submitJoint(s, 'J5', { box: 'C-4' }); assert.ok(r.ok); assert.ok(E.hasFound(s, 's_reel'));
  assert.strictEqual(E.weigh(s, 'C-4'), 1.7);
});
test('원본 대조: 펀칭 번호 표기 차이를 허용하고 규격을 확인한다', () => {
  const s = stateAt('J6');
  let r = E.submitJoint(s, 'J6', { spec: 'p7white', punch: 'L-990803' }); assert.ok(!r.ok);
  r = E.submitJoint(s, 'J6', { spec: 'm10red', punch: 'l 990803' }); assert.ok(r.ok);
  assert.ok(s.pending.includes('found'));
});
test('최종 보고서: 근거 첨부가 틀리거나 확보하지 않은 증거면 반려', () => {
  const s = stateAt('FINAL');
  E.submitJoint(s, 'J6', CORRECT.J6);
  let bad = JSON.parse(JSON.stringify(FINAL_OK)); bad.s3.ev = 's_receipt';
  let r = E.submitConclusion(s, 'FINAL', bad);
  assert.ok(!r.ok && r.results.find(x => x.sentence === 's3').msg.startsWith('[근거]'));
  bad = JSON.parse(JSON.stringify(FINAL_OK)); bad.s1.culprit = 'han';
  r = E.submitConclusion(s, 'FINAL', bad);
  eq(r.results.filter(x => !x.ok).map(x => x.sentence), ['s1']);
  const s2 = stateAt('FINAL'); E.submitJoint(s2, 'J6', CORRECT.J6);
  delete s2.roles.ian.found.i_audit;
  r = E.submitConclusion(s2, 'FINAL', FINAL_OK);
  assert.ok(!r.ok, '확보하지 않은 증거는 근거로 쓸 수 없다');
  r = E.submitConclusion(s, 'FINAL', FINAL_OK);
  assert.ok(r.ok); assert.strictEqual(s.phase, 'ending'); assert.strictEqual(s.shared.concl.FINAL.tries, 3);
  assert.ok(E.chooseEnding(s, 'air')); assert.ok(s.pending.includes('ending_air'));
});
test('힌트는 3단계까지만 오른다', () => {
  const s = E.newState();
  assert.strictEqual(E.useHint(s, 'J1'), 1); E.useHint(s, 'J1'); E.useHint(s, 'J1');
  assert.strictEqual(E.useHint(s, 'J1'), 3);
  eq(E.hintsUsedTotal(s), { 1: 1, 2: 1, 3: 1 });
});
test('가설 보드: 상태 변경 기록, 증거 연결, 공동 결론 도장', () => {
  const s = stateAt('IC2');
  assert.ok(E.setSuspect(s, 'seoha', 'min', 'suspect'));
  assert.ok(E.setSuspect(s, 'seoha', 'min', 'cleared'));
  assert.strictEqual(s.roles.seoha.suspectLog.length, 2);
  assert.ok(E.linkEvidence(s, 'seoha', 'min', 's_receipt', 'against'));
  assert.ok(!E.linkEvidence(s, 'seoha', 'min', 'i_bms_light', 'for'), '상대 역할 증거는 연결 불가');
  assert.strictEqual(E.sharedVerdicts(s).min, 'cleared');
  assert.strictEqual(s.roles.ian.suspects.min.status, 'open', '가설 보드는 역할별');
});

console.log('저장 · 복구');
test('저장 후 불러오면 진행·노트·가설이 그대로다', () => {
  const st = memStore(), store = E.safeStorage(st);
  const s = stateAt('IC2');
  E.setNotes(s, 'seoha', '<b>단서</b> & "메모"'); E.setNotes(s, 'ian', '이안 노트');
  E.setSuspect(s, 'ian', 'han', 'suspect');
  E.save(store, s);
  const r = E.load(store);
  assert.strictEqual(r.status, 'ok', JSON.stringify(r.issues));
  assert.strictEqual(r.state.roles.seoha.notes, '<b>단서</b> & "메모"');
  assert.strictEqual(r.state.roles.ian.notes, '이안 노트');
  assert.strictEqual(E.act(r.state), 2);
  assert.strictEqual(r.state.roles.ian.suspects.han.status, 'suspect');
  eq(Object.keys(r.state.roles.seoha.found).sort(), Object.keys(s.roles.seoha.found).sort());
});
test('깨진 JSON은 새로 시작하고 원본을 백업한다', () => {
  const st = memStore({ 'last-broadcast.save': '{"v":2, broken' });
  const r = E.load(E.safeStorage(st));
  assert.strictEqual(r.status, 'corrupt');
  assert.strictEqual(st.data['last-broadcast.save.corrupt'], '{"v":2, broken');
  assert.strictEqual(r.state.phase, 'title');
});
test('객체가 아닌 저장값도 손상으로 처리한다', () => {
  for (const v of ['[1,2]', '"text"', 'null', '42']) assert.strictEqual(E.load(E.safeStorage(memStore({ 'last-broadcast.save': v }))).status, 'corrupt', v);
});
test('선후 관계가 깨진 진행은 앞 단계부터 다시 세운다', () => {
  const s = stateAt('IC2');
  const raw = JSON.parse(E.serialize(s));
  delete raw.shared.concl.IC1; // IC1 없이 J3·MATCH 완료 + IC2 시도 흔적
  raw.shared.concl.IC2 = { done: true, tries: 1 };
  raw.shared.flags.b1Unlocked = true;
  raw.roles.seoha.found.zzz_unknown = 123;
  raw.roles.seoha.found.i_bms_light = 1; // 다른 역할 증거
  raw.roles.ian.notes = 'x'.repeat(30000);
  raw.phase = 'ending';
  const r = E.load(E.safeStorage(memStore({ 'last-broadcast.save': JSON.stringify(raw) })));
  assert.strictEqual(r.status, 'repaired');
  assert.strictEqual(E.act(r.state), 1);
  assert.ok(!E.jointDone(r.state, 'J3') && !E.jointDone(r.state, 'MATCH'));
  assert.ok(E.jointDone(r.state, 'J1') && E.jointDone(r.state, 'J2'));
  assert.ok(!r.state.shared.flags.b1Unlocked);
  assert.ok(!r.state.roles.seoha.found.zzz_unknown && !r.state.roles.seoha.found.i_bms_light);
  assert.strictEqual(r.state.roles.ian.notes.length, 20000);
  assert.strictEqual(r.state.phase, 'play');
});
test('타입이 엉망인 필드도 기본값으로 복구한다', () => {
  const raw = { v: 2, phase: 42, role: 'nobody', mode: 'remote', shared: 'x', roles: { seoha: { found: [1, 2], notes: 5, suspects: { yoon: { status: 'killer', memo: {} } } }, ian: null }, pending: ['nope', 'act2'], seen: 'z' };
  const r = E.load(E.safeStorage(memStore({ 'last-broadcast.save': JSON.stringify(raw) })));
  assert.strictEqual(r.status, 'repaired');
  assert.strictEqual(r.state.role, 'seoha'); assert.strictEqual(r.state.mode, null);
  assert.strictEqual(r.state.roles.seoha.notes, ''); assert.strictEqual(r.state.roles.seoha.suspects.yoon.status, 'open');
  eq(r.state.pending, [], '선행 조건 없는 장면은 대기열에서 빠진다');
});
test('더 새로운 버전의 저장은 알 수 있는 항목만 불러온다', () => {
  const s = stateAt('IC1'); const raw = JSON.parse(E.serialize(s)); raw.v = 99; raw.futureField = { a: 1 };
  const r = E.load(E.safeStorage(memStore({ 'last-broadcast.save': JSON.stringify(raw) })));
  assert.strictEqual(r.status, 'repaired'); assert.ok(r.issues[0].includes('새로운 버전'));
  assert.ok(E.jointDone(r.state, 'J1'));
});
test('원본 체험판(broadcast-v1) 저장은 노트만 옮긴다', () => {
  const st = memStore({ 'broadcast-v1': JSON.stringify({ role: 'A', phase: 2, notes: { A: '현장 메모', B: '송출 메모' }, won: true }) });
  const r = E.load(E.safeStorage(st));
  assert.strictEqual(r.status, 'legacy'); assert.strictEqual(r.legacyNotes, 2);
  assert.ok(r.state.roles.seoha.notes.endsWith('현장 메모')); assert.ok(r.state.roles.ian.notes.endsWith('송출 메모'));
  assert.strictEqual(r.state.phase, 'title');
});
test('저장소가 막힌 환경에서는 메모리로 동작한다', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const store = E.safeStorage(broken);
  assert.strictEqual(store.available, false);
  const s = E.newState(); s.phase = 'play';
  assert.strictEqual(E.save(store, s), false);
  assert.strictEqual(E.load(store).state.phase, 'play');
  const nul = E.safeStorage(null); assert.strictEqual(nul.available, false);
});
test('엔딩 이후 저장은 엔딩 선택과 함께 재진입된다', () => {
  const s = stateAt('FINAL'); E.submitJoint(s, 'J6', CORRECT.J6);
  E.submitConclusion(s, 'FINAL', FINAL_OK); E.finishScene(s, 'found'); E.chooseEnding(s, 'seal'); E.finishScene(s, 'confront'); E.finishScene(s, 'ending_seal');
  const store = E.safeStorage(memStore()); E.save(store, s);
  const r = E.load(store);
  assert.strictEqual(r.status, 'ok', JSON.stringify(r.issues));
  assert.strictEqual(r.state.phase, 'ending'); assert.strictEqual(r.state.shared.endingChoice, 'seal'); eq(r.state.pending, []);
});
test('설정은 진행과 따로 저장되고 잘못된 값은 기본값', () => {
  const st = memStore({ 'last-broadcast.settings': JSON.stringify({ sound: 'yes', volume: 7, showTimer: true }) });
  const set = E.loadSettings(E.safeStorage(st));
  assert.strictEqual(set.sound, true); assert.strictEqual(set.volume, 1); assert.strictEqual(set.showTimer, true);
});
test('경과 시간은 플레이 중에만 늘고 한 번에 5초 이상 더하지 않는다', () => {
  const s = E.newState(); E.tick(s, 1000); assert.strictEqual(s.shared.elapsedMs, 0);
  s.phase = 'play'; E.tick(s, 1000); E.tick(s, 60000); assert.strictEqual(s.shared.elapsedMs, 6000);
});

console.log('\n' + passed + '개 통과' + (failures.length ? ', ' + failures.length + '개 실패' : ''));
console.log('참고: 이 검사는 엔진과 데이터만 확인한다. 실제 화면·조작·소리는 browser-qa.mjs와 사람 플레이테스트로 확인해야 한다.');
process.exit(failures.length ? 1 : 0);
