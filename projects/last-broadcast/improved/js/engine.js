/*
 * 마지막 송출 — 게임 엔진 (DOM 없음)
 * 상태 모델, 조건 평가, 조사·분석·결론 채점, 저장/복구를 담당한다.
 * 모든 변경 함수는 state를 직접 수정하고 결과 객체를 돌려준다. 저장은 호출하는 쪽(UI)이 한다.
 */
(function (root) {
  'use strict';
  var LB = (root.LB = root.LB || {});
  var C = LB.CASE;
  if (!C) throw new Error('case-data.js must load before engine.js');

  var SAVE_KEY = 'last-broadcast.save';
  var SETTINGS_KEY = 'last-broadcast.settings';
  var LEGACY_KEYS = ['broadcast-v1'];
  var SAVE_VERSION = 2;
  var ROLES = ['seoha', 'ian'];
  var SUSPECTS = ['yoon', 'han', 'min'];
  var PHASES = ['title', 'prologue', 'pickrole', 'play', 'ending'];
  var NOTE_MAX = 20000;
  var MEMO_MAX = 600;

  /* ───────── 유틸 ───────── */
  var util = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    /* 'HH:MM:SS' | 'HH:MM' | 'HHMMSS' | 'HHMM' → 초. 실패 시 null. hasSec로 초 입력 여부 */
    parseTime: function (str) {
      if (typeof str !== 'string') return null;
      var s = str.trim().replace(/[\s.]/g, ':');
      var m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) {
        var d = s.replace(/\D/g, '');
        if (d.length === 6) m = [s, d.slice(0, 2), d.slice(2, 4), d.slice(4, 6)];
        else if (d.length === 4) m = [s, d.slice(0, 2), d.slice(2, 4), undefined];
        else return null;
      }
      var h = +m[1], mi = +m[2], se = m[3] === undefined ? 0 : +m[3];
      if (h > 23 || mi > 59 || se > 59) return null;
      return { sec: h * 3600 + mi * 60 + se, hasSec: m[3] !== undefined };
    },
    toSec: function (hms) { var p = util.parseTime(hms); return p ? p.sec : 0; },
    fmt: function (sec, withSec) {
      sec = ((Math.round(sec) % 86400) + 86400) % 86400;
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return p(h) + ':' + p(m) + (withSec === false ? '' : ':' + p(s));
    },
    mmss: function (sec) {
      sec = Math.max(0, sec);
      var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    },
    rng: function (seed) {
      var a = (seed >>> 0) || 1;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    normCode: function (s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); },
    isObj: function (o) { return !!o && typeof o === 'object' && !Array.isArray(o); },
    /* 받침에 맞는 조사: josa('이안', '이/가') → '이안이' */
    josa: function (word, pair) {
      var w = String(word), p = pair.split('/'), c = w.charCodeAt(w.length - 1);
      if (c < 0xac00 || c > 0xd7a3) return w + p[1];
      var jong = (c - 0xac00) % 28;
      if (pair === '으로/로') return w + (jong === 0 || jong === 8 ? p[1] : p[0]);
      return w + (jong === 0 ? p[1] : p[0]);
    }
  };

  /* ───────── 색인 ───────── */
  var EV = {}, HOT = {}, TOPIC = {}, LOC = C.locations, JOINT = C.joints, CONCL = C.conclusions;
  (function buildIndex() {
    var k;
    for (k in C.evidence) EV[k] = C.evidence[k];
    for (k in C.extraEvidence) EV[k] = C.extraEvidence[k];
    C.topics.forEach(function (t) {
      TOPIC[t.id] = t;
      EV[t.id] = {
        owner: 'seoha', type: 'testimony', topic: t.id,
        title: C.people[t.who].name + ' · ' + t.q,
        short: t.a[0],
        quote: { who: t.who, lines: t.a, note: t.note }
      };
    });
    Object.keys(LOC).forEach(function (lid) {
      LOC[lid].hotspots.forEach(function (h) { HOT[h.id] = Object.assign({ loc: lid }, h); });
    });
    Object.keys(EV).forEach(function (id) { EV[id].id = id; });
  })();

  var SCENE_IDS = Object.keys(C.scenes);
  var FLAG_IDS = ['b1Unlocked'];

  /* ───────── 상태 ───────── */
  function newRole() {
    var sus = {};
    SUSPECTS.forEach(function (s) { sus[s] = { status: 'open', memo: '', links: [] }; });
    return { found: {}, read: {}, examined: {}, notes: '', suspects: sus, suspectLog: [], registryHits: [], weighed: [], view: null };
  }
  function newState() {
    var now = Date.now();
    return {
      v: SAVE_VERSION, created: now, updated: now,
      phase: 'title', mode: null, role: 'seoha', prologueStep: 0,
      pending: [], seen: {},
      shared: { joints: {}, concl: {}, hints: {}, flags: {}, opened: [], endingChoice: null, completedAt: null, elapsedMs: 0 },
      roles: { seoha: newRole(), ian: newRole() }
    };
  }
  function defaultSettings() { return { sound: true, volume: 0.6, ambience: false, showTimer: false }; }

  function act(state) {
    if (conclDone(state, 'IC2')) return 3;
    if (conclDone(state, 'IC1')) return 2;
    return 1;
  }
  function jointDone(state, id) { var j = state.shared.joints[id]; return !!(j && j.done); }
  function conclDone(state, id) { var c = state.shared.concl[id]; return !!(c && c.done); }
  function hasFound(state, id) {
    var ev = EV[id]; if (!ev) return false;
    return !!state.roles[ev.owner].found[id];
  }

  function check(state, cond) {
    if (!cond) return true;
    if (cond.all) return cond.all.every(function (c) { return check(state, c); });
    if (cond.any) return cond.any.some(function (c) { return check(state, c); });
    if (cond.not) return !check(state, cond.not);
    if (cond.act) return act(state) >= cond.act;
    if (cond.joint) return jointDone(state, cond.joint);
    if (cond.concl) return conclDone(state, cond.concl);
    if (cond.found) return hasFound(state, cond.found);
    if (cond.asked) return hasFound(state, cond.asked);
    if (cond.flag) return !!state.shared.flags[cond.flag];
    return false;
  }

  function touch(state) { state.updated = Date.now(); }

  /* 증거 지급: 주인 역할의 found에 넣는다. 새로 추가된 id 목록 반환 */
  function grant(state, ids) {
    var added = [];
    (ids || []).forEach(function (id) {
      var ev = EV[id]; if (!ev) return;
      var r = state.roles[ev.owner];
      if (!r.found[id]) { r.found[id] = Date.now(); added.push(id); }
    });
    if (added.length) touch(state);
    return added;
  }
  function grantSpec(state, spec) {
    var ids = [];
    if (!spec) return [];
    ROLES.forEach(function (r) { if (spec[r]) ids = ids.concat(spec[r]); });
    return grant(state, ids);
  }
  function markRead(state, role, id) {
    var r = state.roles[role];
    if (r.found[id] && !r.read[id]) { r.read[id] = Date.now(); touch(state); return true; }
    return false;
  }
  function unreadCount(state, role) {
    var r = state.roles[role];
    return Object.keys(r.found).filter(function (id) { return !r.read[id]; }).length;
  }

  /* ───────── 서하: 장소·핫스팟·인터뷰 ───────── */
  function locationUnlocked(state, lid) { var l = LOC[lid]; return !!l && check(state, l.unlock); }
  function hotspotUnlocked(state, hid) {
    var h = HOT[hid]; return !!h && locationUnlocked(state, h.loc) && check(state, h.unlock);
  }
  function locationInfo(state, lid) {
    var l = LOC[lid], ex = state.roles.seoha.examined;
    var open = l.hotspots.filter(function (h) { return hotspotUnlocked(state, h.id); });
    var fresh = open.filter(function (h) { return !ex[h.id]; }).length;
    return { unlocked: locationUnlocked(state, lid), total: open.length, fresh: fresh, done: open.length - fresh };
  }
  function examine(state, hid) {
    var h = HOT[hid];
    if (!h || !hotspotUnlocked(state, hid)) return { ok: false, added: [] };
    var r = state.roles.seoha;
    var first = !r.examined[hid];
    r.examined[hid] = r.examined[hid] || Date.now();
    var added = grant(state, h.grants);
    touch(state);
    return { ok: true, first: first, added: added, line: h.line, action: h.action || null };
  }
  function topicUnlocked(state, tid) { var t = TOPIC[tid]; return !!t && check(state, t.unlock); }
  function ask(state, tid) {
    var t = TOPIC[tid];
    if (!t || !topicUnlocked(state, tid)) return { ok: false, added: [] };
    var added = grant(state, [tid].concat(t.grants || []));
    return { ok: true, added: added, topic: t };
  }
  function topicsFor(state, who) {
    return C.topics.filter(function (t) { return t.who === who; }).map(function (t) {
      return { topic: t, unlocked: topicUnlocked(state, t.id), asked: hasFound(state, t.id) };
    });
  }

  /* ───────── 이안: 장비 ───────── */
  function stationItemUnlocked(state, item) { return check(state, item.unlock); }
  function openRecord(state, evId) {
    var ev = EV[evId]; if (!ev || ev.owner !== 'ian') return [];
    return grant(state, [evId]);
  }
  function audioLibrary(state) {
    var list = [{ ev: 'i_rec_onair' }];
    if (conclDone(state, 'IC1')) list.push({ ev: 'i_rec_t1' }, { ev: 'i_rec_t2' }, { ev: 'i_rec_backup' });
    return list;
  }
  function runAction(state, actionId) {
    var a = (C.stations.bms.actions || []).filter(function (x) { return x.id === actionId; })[0];
    if (!a || !check(state, a.unlock)) return { ok: false };
    if (state.shared.flags[a.flag]) return { ok: true, already: true, text: a.done };
    state.shared.flags[a.flag] = true; touch(state);
    return { ok: true, text: a.done };
  }
  function searchRegistry(state, query) {
    var q = util.normCode(query);
    if (q.length < 4) return { ok: false, reason: 'short', hits: [] };
    var hits = C.registry.filter(function (r) {
      return util.normCode(r.no).indexOf(q) >= 0 || util.normCode(r.punch).indexOf(q) >= 0 || util.normCode(r.title).indexOf(q) >= 0;
    });
    var role = state.roles.ian;
    hits.forEach(function (h) { if (role.registryHits.indexOf(h.no) < 0) role.registryHits.push(h.no); });
    if (hits.length) grant(state, ['i_registry']);
    touch(state);
    return { ok: true, hits: hits };
  }

  /* ───────── 공동 분석 ───────── */
  function jointAvailable(state, id) {
    var j = JOINT[id]; if (!j) return false;
    return act(state) >= j.act && check(state, j.requires);
  }
  function recordJoint(state, id, ok) {
    var rec = state.shared.joints[id] || (state.shared.joints[id] = { done: false, tries: 0 });
    rec.tries = Math.min(999, (rec.tries || 0) + 1);
    var added = [];
    if (ok && !rec.done) {
      rec.done = true; rec.at = Date.now();
      added = grant(state, JOINT[id].grants);
      if (id === 'J6') queueScene(state, 'found');
    }
    touch(state);
    return added;
  }
  function gradeFields(def, input) {
    var wrong = [];
    def.fields.forEach(function (f) {
      var v = input[f.id];
      var want = def.answer[f.id];
      var ok = f.type === 'text' ? util.normCode(v) === util.normCode(want) : v === want;
      if (!ok) {
        var fb = def.feedback && def.feedback[f.id];
        var msg = typeof fb === 'string' ? fb : (fb && fb[v]) || (v ? f.label + ': 다른 기록과 맞지 않습니다.' : f.label + ': 아직 고르지 않았습니다.');
        wrong.push({ field: f.id, msg: msg });
      }
    });
    return wrong;
  }
  function submitJoint(state, id, input) {
    var j = JOINT[id];
    if (!j || !jointAvailable(state, id)) return { ok: false, locked: true, msgs: ['아직 진행할 수 없는 분석입니다.'] };
    if (jointDone(state, id)) return { ok: true, already: true, msgs: [] };
    input = input || {};
    var ok = false, msgs = [];
    if (id === 'J1') {
      var pair = (j.pairs.filter(function (p) { return p.id === input.pair; })[0]);
      var t = util.parseTime(input.dvr || '');
      if (!pair) msgs.push('건물 기록에서 맞춰 볼 사건을 고르세요.');
      else if (!t) msgs.push('CCTV 표시 시각을 21:54:05처럼 시·분·초로 입력하세요.');
      else if (!t.hasSec) msgs.push('초까지 입력해야 오차를 정확히 잴 수 있습니다. 서하에게 초 단위를 물어보세요.');
      else {
        var diff = t.sec - util.toSec(pair.std);
        if (diff === j.offsetSec) ok = true;
        else if (diff < 0) msgs.push('CCTV 시각이 건물 기록보다 이르게 나옵니다. 같은 사건을 고른 게 맞나요?');
        else if (Math.abs(diff - j.offsetSec) <= 60) msgs.push('거의 맞습니다. 같은 순간인지 초 단위까지 서하와 다시 확인하세요.');
        else msgs.push('두 기록이 같은 순간을 가리키지 않는 것 같습니다. 서하에게 그 장면에서 무슨 일이 있었는지 물어보세요.');
      }
    } else if (id === 'J2') {
      var lg = util.normCode(input.logger);
      if (lg === util.normCode(j.answer.logger)) ok = true;
      else {
        var key = Object.keys(j.feedback.logger).filter(function (k) { return util.normCode(k) === lg; })[0];
        msgs.push(key ? j.feedback.logger[key] : '목록에 없는 번호이거나 금고 안 기록계가 아닙니다.');
      }
    } else if (id === 'MATCH') {
      var off = Number(input.offset);
      if (input.rec !== j.answer.rec) msgs.push('겹쳐지지 않는 마커가 있습니다. 다른 파일과 비교해 보세요.');
      else if (!isFinite(off) || Math.abs(off - j.answer.offset) > j.answer.tol) msgs.push('파일은 맞는 것 같지만 아직 마커가 어긋납니다. 위치를 더 밀어 보세요.');
      else ok = true;
    } else if (id === 'J5') {
      var box = C.boxes.filter(function (b) { return b.id === input.box; })[0];
      if (!box) return { ok: false, msgs: ['상자를 고르세요.'] };
      if (state.shared.opened.indexOf(box.id) < 0) state.shared.opened.push(box.id);
      if (box.target) ok = true;
      else msgs.push(box.id + ' 봉인을 뜯었다. 안에는 ' + box.contents + '. 업체 목록 그대로다. 뜯은 봉인은 보고서에 남는다.');
    } else {
      var wrong = gradeFields(j, input);
      ok = wrong.length === 0;
      msgs = wrong.map(function (w) { return w.msg; });
    }
    var added = recordJoint(state, id, ok);
    return { ok: ok, msgs: msgs, added: added, fact: ok ? j.fact : null };
  }
  function jointsForAct(state, n) {
    return Object.keys(JOINT).filter(function (id) { return JOINT[id].act === n; });
  }

  /* 음원 비교: 마커 일치 수 (UI 표시용, 채점은 submitJoint('MATCH')) */
  function recMarkers(recId) {
    if (recId === 'onair') return C.markers.t2.map(function (m) { return [m[0] + 30, m[1]]; });
    return C.markers[recId] || [];
  }
  function recScript(recId) {
    if (recId === 'onair') return C.takeScript.t2.map(function (m) { return [m[0] + 30, m[1]]; });
    return C.takeScript[recId] || [];
  }
  function compareMarkers(baseId, otherId, offset) {
    var base = recMarkers(baseId), other = recMarkers(otherId);
    var matched = 0;
    base.forEach(function (bm) {
      if (other.some(function (om) { return om[1] === bm[1] && Math.abs(om[0] + offset - bm[0]) <= 0.35; })) matched++;
    });
    return { matched: matched, total: base.length };
  }

  /* ───────── 공동 결론 ───────── */
  function conclAvailable(state, id) {
    var c = CONCL[id]; if (!c) return false;
    return act(state) >= c.act && (c.requires || []).every(function (r) { return check(state, r); });
  }
  function sameSet(a, b) {
    if (!Array.isArray(a) || a.length !== b.length) return false;
    return b.every(function (x) { return a.indexOf(x) >= 0; });
  }
  function gradeIC(c, input) {
    var out = [];
    c.fields.forEach(function (f) {
      var v = input[f.id], fb = c.feedback[f.id] || {};
      if (f.multi === 2) {
        var arr = Array.isArray(v) ? v : [];
        if (arr.length !== 2) { out.push({ field: f.id, ok: false, msg: fb.count }); return; }
        var bad = arr.filter(function (x) { return c.answer[f.id].indexOf(x) < 0; });
        out.push(bad.length ? { field: f.id, ok: false, msg: fb[bad[0]] || '[근거] 근거가 되지 않는 항목이 있습니다.' } : { field: f.id, ok: true });
      } else if (f.multi === 'any') {
        var set = Array.isArray(v) ? v : [];
        if (sameSet(set, c.answer[f.id])) out.push({ field: f.id, ok: true });
        else {
          var extra = set.filter(function (x) { return c.answer[f.id].indexOf(x) < 0; });
          out.push({ field: f.id, ok: false, msg: extra.length ? (fb[extra[0]] || fb.missing) : fb.missing });
        }
      } else {
        if (v === c.answer[f.id]) out.push({ field: f.id, ok: true });
        else out.push({ field: f.id, ok: false, msg: v ? (fb[v] || '[기록] 다른 기록과 맞지 않습니다.') : f.label + ': 아직 고르지 않았습니다.' });
      }
    });
    return out;
  }
  function gradeFinal(c, input) {
    return c.sentences.map(function (s) {
      var given = input[s.id] || {}, want = c.answer[s.id] || {};
      var missing = s.fields.some(function (f) { return !given[f.id]; });
      if (missing) return { sentence: s.id, ok: false, msg: '빈칸을 모두 채우세요.' };
      var okVals = s.fields.every(function (f) { return f.evidence ? true : given[f.id] === want[f.id]; });
      if (!okVals) return { sentence: s.id, ok: false, msg: c.feedback[s.id] };
      var evf = s.fields.filter(function (f) { return f.evidence; })[0];
      if (evf && f_accept(evf, given[evf.id]) === false) return { sentence: s.id, ok: false, msg: c.feedback.ev };
      return { sentence: s.id, ok: true };
    });
  }
  function f_accept(f, val) { return f.accept.indexOf(val) >= 0; }

  function submitConclusion(state, id, input) {
    var c = CONCL[id];
    if (!c || !conclAvailable(state, id)) return { ok: false, locked: true, results: [] };
    if (conclDone(state, id)) return { ok: true, already: true, results: [] };
    input = input || {};
    var results = id === 'FINAL' ? gradeFinal(c, input) : gradeIC(c, input);
    if (id === 'FINAL') {
      // 첨부한 증거는 실제로 확보한 것이어야 한다
      results.forEach(function (r, i) {
        var s = c.sentences[i], evf = s.fields.filter(function (f) { return f.evidence; })[0];
        var val = evf && (input[s.id] || {})[evf.id];
        if (r.ok && evf && !hasFound(state, val)) { r.ok = false; r.msg = c.feedback.ev; }
      });
    }
    var ok = results.every(function (r) { return r.ok; });
    var rec = state.shared.concl[id] || (state.shared.concl[id] = { done: false, tries: 0 });
    rec.tries = Math.min(999, (rec.tries || 0) + 1);
    rec.last = util.clone(input);
    if (ok) {
      rec.done = true; rec.at = Date.now();
      if (id === 'IC1') queueScene(state, 'act2');
      if (id === 'IC2') queueScene(state, 'act3');
      if (id === 'FINAL') { queueScene(state, 'confront'); state.phase = 'ending'; }
    }
    touch(state);
    return { ok: ok, results: results, tries: rec.tries };
  }

  /* ───────── 공유 사실·타임라인 ───────── */
  function factsUnlocked(state) {
    var out = [];
    ['J1', 'J2'].forEach(function (j) { if (jointDone(state, j)) out.push(JOINT[j].fact); });
    if (conclDone(state, 'IC1')) out.push('F_ic1');
    ['J3', 'MATCH'].forEach(function (j) { if (jointDone(state, j)) out.push(JOINT[j].fact); });
    if (conclDone(state, 'IC2')) out.push('F_ic2');
    ['J4', 'J5', 'J6'].forEach(function (j) { if (jointDone(state, j)) out.push(JOINT[j].fact); });
    return out;
  }
  function cctvOffset(state) { return jointDone(state, 'J1') ? JOINT.J1.offsetSec : null; }
  function timeline(state, role, corrected) {
    var r = state.roles[role], items = [];
    var off = cctvOffset(state);
    Object.keys(r.found).forEach(function (id) {
      var ev = EV[id];
      (ev.times || []).forEach(function (tm) {
        items.push({ sec: util.toSec(tm.t), t: tm.t, label: tm.label, clock: tm.clock, ev: id });
      });
      if (ev.type === 'cctv') {
        C.cctv.forEach(function (k, i) {
          var s = util.toSec(k.t);
          var useCorr = corrected && off !== null;
          items.push({ sec: useCorr ? s - off : s, t: useCorr ? util.fmt(s - off) : k.t, raw: k.t, label: 'CCTV · ' + k.text.split('.')[0], clock: useCorr ? 'corr' : 'dvr', ev: id, key: i });
        });
      }
    });
    factsUnlocked(state).forEach(function (fid) {
      (C.facts[fid].times || []).forEach(function (tm) {
        items.push({ sec: util.toSec(tm.t), t: tm.t, label: tm.label, clock: 'shared', fact: fid });
      });
    });
    items.sort(function (a, b) { return a.sec - b.sec || (a.clock === 'shared' ? -1 : 1); });
    return items;
  }

  /* ───────── 목표·힌트 ───────── */
  function objectives(state) {
    var n = act(state);
    return C.objectives[n].map(function (o) { return { obj: o, done: check(state, o.done) }; });
  }
  function currentObjective(state) {
    var list = objectives(state);
    for (var i = 0; i < list.length; i++) if (!list[i].done) return list[i].obj;
    return null;
  }
  function useHint(state, key) {
    var hs = C.hints[key]; if (!hs) return null;
    var cur = state.shared.hints[key] || 0;
    if (cur < hs.length) { state.shared.hints[key] = cur + 1; touch(state); }
    return state.shared.hints[key];
  }
  function hintsUsedTotal(state) {
    var h = state.shared.hints, t = { 1: 0, 2: 0, 3: 0 };
    Object.keys(h).forEach(function (k) { for (var i = 1; i <= h[k]; i++) t[i]++; });
    return t;
  }

  /* ───────── 장면 ───────── */
  function queueScene(state, id) {
    if (C.scenes[id] && state.pending.indexOf(id) < 0 && !state.seen[id]) state.pending.push(id);
  }
  function finishScene(state, id) {
    state.pending = state.pending.filter(function (x) { return x !== id; });
    state.seen[id] = Date.now();
    touch(state);
  }
  function chooseEnding(state, choice) {
    if (!conclDone(state, 'FINAL') || ['seal', 'air'].indexOf(choice) < 0) return false;
    state.shared.endingChoice = choice;
    state.shared.completedAt = state.shared.completedAt || Date.now();
    queueScene(state, choice === 'air' ? 'ending_air' : 'ending_seal');
    touch(state);
    return true;
  }

  /* ───────── 역할·노트·가설 ───────── */
  function switchRole(state) { state.role = state.role === 'seoha' ? 'ian' : 'seoha'; touch(state); return state.role; }
  function setNotes(state, role, text) { state.roles[role].notes = String(text || '').slice(0, NOTE_MAX); touch(state); }
  function setSuspect(state, role, who, status) {
    var r = state.roles[role];
    if (SUSPECTS.indexOf(who) < 0 || ['open', 'suspect', 'cleared'].indexOf(status) < 0) return false;
    var prev = r.suspects[who].status;
    if (prev === status) return false;
    r.suspects[who].status = status;
    r.suspectLog.push({ at: Date.now(), who: who, from: prev, to: status, act: act(state) });
    if (r.suspectLog.length > 100) r.suspectLog = r.suspectLog.slice(-100);
    touch(state);
    return true;
  }
  function setSuspectMemo(state, role, who, memo) {
    if (SUSPECTS.indexOf(who) < 0) return;
    state.roles[role].suspects[who].memo = String(memo || '').slice(0, MEMO_MAX);
    touch(state);
  }
  function linkEvidence(state, role, who, evId, stance) {
    var r = state.roles[role];
    if (SUSPECTS.indexOf(who) < 0 || !r.found[evId] || (stance !== 'for' && stance !== 'against' && stance !== null)) return false;
    var list = r.suspects[who].links.filter(function (l) { return l.ev !== evId; });
    if (stance) list.push({ ev: evId, stance: stance });
    r.suspects[who].links = list.slice(-40);
    touch(state);
    return true;
  }
  function weigh(state, boxId) {
    var b = C.boxes.filter(function (x) { return x.id === boxId; })[0];
    if (!b || !locationUnlocked(state, 'staging')) return null;
    var w = state.roles.seoha.weighed;
    if (w.indexOf(boxId) < 0) { w.push(boxId); touch(state); }
    return b.weight;
  }
  function sharedVerdicts(state) {
    var v = {};
    if (conclDone(state, 'IC1')) v.min = 'cleared';
    if (jointDone(state, 'J4')) v.han = 'cleared';
    if (conclDone(state, 'FINAL')) v.yoon = 'culprit';
    return v;
  }
  function tick(state, ms) {
    if (state.phase !== 'play' && state.phase !== 'prologue') return;
    if (state.shared.completedAt) return;
    state.shared.elapsedMs = Math.min(1e9, (state.shared.elapsedMs || 0) + Math.max(0, Math.min(ms, 5000)));
  }

  /* ───────── 저장·복구 ───────── */
  function safeStorage(ls) {
    var mem = {}, ok = true;
    function test() { try { var k = '__lb_test__'; ls.setItem(k, '1'); ls.removeItem(k); return true; } catch (e) { return false; } }
    if (!ls || !test()) ok = false;
    return {
      available: ok,
      get: function (k) { if (!ok) return mem[k] == null ? null : mem[k]; try { return ls.getItem(k); } catch (e) { return null; } },
      set: function (k, v) {
        if (!ok) { mem[k] = v; return false; }
        try { ls.setItem(k, v); return true; } catch (e) { mem[k] = v; return false; }
      },
      remove: function (k) { delete mem[k]; if (ok) try { ls.removeItem(k); } catch (e) { /* ignore */ } }
    };
  }
  function int(v, min, max, def) { return (typeof v === 'number' && isFinite(v)) ? Math.max(min, Math.min(max, Math.floor(v))) : def; }
  function ts(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : Date.now(); }

  /* 어떤 입력이 와도 유효한 상태를 만든다. issues에 버린 항목을 적는다. */
  function sanitize(raw) {
    var issues = [];
    var s = newState();
    if (!util.isObj(raw)) return { state: s, issues: ['저장 형식이 객체가 아닙니다.'] };
    if (typeof raw.v === 'number' && raw.v > SAVE_VERSION) issues.push('더 새로운 버전에서 저장된 기록입니다. 알 수 있는 항목만 불러왔습니다.');
    s.created = ts(raw.created);
    if (PHASES.indexOf(raw.phase) >= 0) s.phase = raw.phase; else if (raw.phase !== undefined) issues.push('진행 화면 값');
    if (raw.mode === 'duo' || raw.mode === 'solo') s.mode = raw.mode;
    if (ROLES.indexOf(raw.role) >= 0) s.role = raw.role;
    s.prologueStep = int(raw.prologueStep, 0, C.scenes.prologue.length, 0);

    var sh = util.isObj(raw.shared) ? raw.shared : {};
    if (!util.isObj(raw.shared)) issues.push('공유 진행 기록');
    var J = util.isObj(sh.joints) ? sh.joints : {};
    Object.keys(J).forEach(function (id) {
      if (!JOINT[id] || !util.isObj(J[id])) { issues.push('알 수 없는 분석 ' + id); return; }
      s.shared.joints[id] = { done: J[id].done === true, tries: int(J[id].tries, 0, 999, 0), at: J[id].done === true ? ts(J[id].at) : undefined };
    });
    var K = util.isObj(sh.concl) ? sh.concl : {};
    Object.keys(K).forEach(function (id) {
      if (!CONCL[id] || !util.isObj(K[id])) { issues.push('알 수 없는 결론 ' + id); return; }
      s.shared.concl[id] = { done: K[id].done === true, tries: int(K[id].tries, 0, 999, 0), at: K[id].done === true ? ts(K[id].at) : undefined, last: util.isObj(K[id].last) ? K[id].last : undefined };
    });
    var H = util.isObj(sh.hints) ? sh.hints : {};
    Object.keys(H).forEach(function (k) { if (C.hints[k]) s.shared.hints[k] = int(H[k], 0, C.hints[k].length, 0); });
    var F = util.isObj(sh.flags) ? sh.flags : {};
    FLAG_IDS.forEach(function (f) { if (F[f] === true) s.shared.flags[f] = true; });
    if (Array.isArray(sh.opened)) s.shared.opened = sh.opened.filter(function (b, i, a) {
      return C.boxes.some(function (x) { return x.id === b; }) && a.indexOf(b) === i;
    });
    if (sh.endingChoice === 'seal' || sh.endingChoice === 'air') s.shared.endingChoice = sh.endingChoice;
    if (typeof sh.completedAt === 'number' && isFinite(sh.completedAt)) s.shared.completedAt = sh.completedAt;
    s.shared.elapsedMs = (typeof sh.elapsedMs === 'number' && isFinite(sh.elapsedMs)) ? Math.max(0, Math.min(1e9, sh.elapsedMs)) : 0;

    var R = util.isObj(raw.roles) ? raw.roles : {};
    if (!util.isObj(raw.roles)) issues.push('역할별 기록');
    ROLES.forEach(function (role) {
      var src = util.isObj(R[role]) ? R[role] : {}, dst = s.roles[role];
      var fd = util.isObj(src.found) ? src.found : {};
      Object.keys(fd).forEach(function (id) {
        if (EV[id] && EV[id].owner === role) dst.found[id] = ts(fd[id]);
        else issues.push('알 수 없는 증거 ' + id);
      });
      var rd = util.isObj(src.read) ? src.read : {};
      Object.keys(rd).forEach(function (id) { if (dst.found[id]) dst.read[id] = ts(rd[id]); });
      var ex = util.isObj(src.examined) ? src.examined : {};
      Object.keys(ex).forEach(function (id) { if (role === 'seoha' && HOT[id]) dst.examined[id] = ts(ex[id]); });
      if (typeof src.notes === 'string') dst.notes = src.notes.slice(0, NOTE_MAX);
      var su = util.isObj(src.suspects) ? src.suspects : {};
      SUSPECTS.forEach(function (w) {
        var x = util.isObj(su[w]) ? su[w] : {};
        if (['open', 'suspect', 'cleared'].indexOf(x.status) >= 0) dst.suspects[w].status = x.status;
        if (typeof x.memo === 'string') dst.suspects[w].memo = x.memo.slice(0, MEMO_MAX);
        if (Array.isArray(x.links)) dst.suspects[w].links = x.links.filter(function (l) {
          return util.isObj(l) && dst.found[l.ev] && (l.stance === 'for' || l.stance === 'against');
        }).slice(0, 40).map(function (l) { return { ev: l.ev, stance: l.stance }; });
      });
      if (Array.isArray(src.weighed) && role === 'seoha') dst.weighed = src.weighed.filter(function (b, i, a) {
        return C.boxes.some(function (x) { return x.id === b; }) && a.indexOf(b) === i;
      });
      if (Array.isArray(src.suspectLog)) dst.suspectLog = src.suspectLog.filter(function (e) {
        return util.isObj(e) && SUSPECTS.indexOf(e.who) >= 0 && ['open', 'suspect', 'cleared'].indexOf(e.to) >= 0;
      }).slice(-100).map(function (e) {
        return { at: ts(e.at), who: e.who, from: ['open', 'suspect', 'cleared'].indexOf(e.from) >= 0 ? e.from : 'open', to: e.to, act: int(e.act, 1, 3, 1) };
      });
      if (Array.isArray(src.registryHits)) dst.registryHits = src.registryHits.filter(function (n, i, a) {
        return C.registry.some(function (r) { return r.no === n; }) && a.indexOf(n) === i;
      });
      if (util.isObj(src.view) && typeof src.view.name === 'string' && src.view.name.length < 40) {
        dst.view = { name: src.view.name, param: typeof src.view.param === 'string' ? src.view.param.slice(0, 40) : null };
      }
    });

    repair(s, issues);

    if (Array.isArray(raw.pending)) raw.pending.forEach(function (id) { if (SCENE_IDS.indexOf(id) >= 0) queueScene(s, id); });
    var seen = util.isObj(raw.seen) ? raw.seen : {};
    Object.keys(seen).forEach(function (id) { if (SCENE_IDS.indexOf(id) >= 0) s.seen[id] = ts(seen[id]); });
    s.pending = s.pending.filter(function (id) { return !s.seen[id] && sceneAllowed(s, id); });
    if (s.phase === 'ending' && !conclDone(s, 'FINAL')) { s.phase = 'play'; issues.push('엔딩 상태'); }
    if ((s.phase === 'play' || s.phase === 'pickrole') && !s.mode) s.mode = 'duo';
    if (s.phase === 'prologue' && s.prologueStep >= C.scenes.prologue.length) s.phase = 'pickrole';
    return { state: s, issues: issues };
  }
  function sceneAllowed(s, id) {
    var need = { act2: { concl: 'IC1' }, act3: { concl: 'IC2' }, found: { joint: 'J6' }, confront: { concl: 'FINAL' },
      ending_seal: { concl: 'FINAL' }, ending_air: { concl: 'FINAL' } }[id];
    return check(s, need);
  }
  /* 선후 관계가 깨진 진행을 앞에서부터 다시 세운다 */
  function repair(s, issues) {
    var order = ['J1', 'J2', 'IC1', 'J3', 'MATCH', 'IC2', 'J4', 'J5', 'J6', 'FINAL'];
    var claimed = {};
    order.forEach(function (id) {
      var rec = JOINT[id] ? s.shared.joints[id] : s.shared.concl[id];
      if (rec && rec.done) { claimed[id] = rec.at; rec.done = false; }
    });
    // 앞 단계부터 하나씩 다시 인정한다 (뒤 단계가 앞 단계의 조건을 대신하지 못하게)
    order.forEach(function (id) {
      if (!(id in claimed)) return;
      var isJ = !!JOINT[id], rec = isJ ? s.shared.joints[id] : s.shared.concl[id];
      if (isJ ? jointAvailable(s, id) : conclAvailable(s, id)) { rec.done = true; rec.at = claimed[id]; }
      else { delete rec.at; issues.push((isJ ? '분석 ' : '결론 ') + id + ' 선행 조건'); }
    });
    if (s.shared.flags.b1Unlocked && !conclDone(s, 'IC2')) { delete s.shared.flags.b1Unlocked; issues.push('지하 출입'); }
    if (!conclDone(s, 'FINAL')) { s.shared.endingChoice = null; s.shared.completedAt = null; }
    // 완료된 분석이 주는 증거는 반드시 있어야 한다
    Object.keys(s.shared.joints).forEach(function (id) { if (s.shared.joints[id].done) grant(s, JOINT[id].grants); });
    if (jointDone(s, 'J5') && s.shared.opened.indexOf('C-4') < 0) s.shared.opened.push('C-4');
  }

  function serialize(state) {
    var out = util.clone(state);
    out.v = SAVE_VERSION;
    return JSON.stringify(out);
  }
  function save(store, state) {
    state.updated = Date.now();
    return store.set(SAVE_KEY, serialize(state));
  }
  /* status: 'new' | 'ok' | 'repaired' | 'corrupt' | 'legacy' */
  function load(store) {
    var raw = store.get(SAVE_KEY);
    if (raw == null) {
      for (var i = 0; i < LEGACY_KEYS.length; i++) {
        var lraw = store.get(LEGACY_KEYS[i]);
        if (lraw != null) return importLegacy(lraw);
      }
      return { state: newState(), status: 'new', issues: [] };
    }
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      store.set(SAVE_KEY + '.corrupt', raw);
      return { state: newState(), status: 'corrupt', issues: ['JSON을 읽을 수 없습니다.'] };
    }
    if (!util.isObj(parsed)) {
      store.set(SAVE_KEY + '.corrupt', raw);
      return { state: newState(), status: 'corrupt', issues: ['저장 형식이 객체가 아닙니다.'] };
    }
    var res = sanitize(parsed);
    return { state: res.state, status: res.issues.length ? 'repaired' : 'ok', issues: res.issues };
  }
  /* 원본 체험판(broadcast-v1)은 사건 구조가 달라 진행도는 버리고 역할별 노트만 옮긴다 */
  function importLegacy(lraw) {
    var s = newState(), notes = 0;
    try {
      var old = JSON.parse(lraw);
      if (util.isObj(old) && util.isObj(old.notes)) {
        if (typeof old.notes.A === 'string' && old.notes.A) { s.roles.seoha.notes = ('[이전 체험판 노트]\n' + old.notes.A).slice(0, NOTE_MAX); notes++; }
        if (typeof old.notes.B === 'string' && old.notes.B) { s.roles.ian.notes = ('[이전 체험판 노트]\n' + old.notes.B).slice(0, NOTE_MAX); notes++; }
      }
    } catch (e) { /* 읽을 수 없으면 노트 없이 새로 시작 */ }
    return { state: s, status: 'legacy', issues: [], legacyNotes: notes };
  }
  function loadSettings(store) {
    var d = defaultSettings(), raw = store.get(SETTINGS_KEY);
    if (raw == null) return d;
    try {
      var o = JSON.parse(raw);
      if (!util.isObj(o)) return d;
      if (typeof o.sound === 'boolean') d.sound = o.sound;
      if (typeof o.volume === 'number' && isFinite(o.volume)) d.volume = Math.max(0, Math.min(1, o.volume));
      if (typeof o.ambience === 'boolean') d.ambience = o.ambience;
      if (typeof o.showTimer === 'boolean') d.showTimer = o.showTimer;
    } catch (e) { /* 기본값 사용 */ }
    return d;
  }
  function saveSettings(store, st) { return store.set(SETTINGS_KEY, JSON.stringify(st)); }
  function resetSave(store) { store.remove(SAVE_KEY); return newState(); }

  LB.util = util;
  LB.engine = {
    SAVE_KEY: SAVE_KEY, SETTINGS_KEY: SETTINGS_KEY, SAVE_VERSION: SAVE_VERSION, ROLES: ROLES, SUSPECTS: SUSPECTS,
    EV: EV, HOT: HOT, TOPIC: TOPIC,
    newState: newState, defaultSettings: defaultSettings,
    act: act, check: check, jointDone: jointDone, conclDone: conclDone, hasFound: hasFound,
    grant: grant, grantSpec: grantSpec, markRead: markRead, unreadCount: unreadCount,
    locationUnlocked: locationUnlocked, hotspotUnlocked: hotspotUnlocked, locationInfo: locationInfo, examine: examine,
    topicUnlocked: topicUnlocked, ask: ask, topicsFor: topicsFor,
    stationItemUnlocked: stationItemUnlocked, openRecord: openRecord, audioLibrary: audioLibrary, runAction: runAction, searchRegistry: searchRegistry,
    jointAvailable: jointAvailable, submitJoint: submitJoint, jointsForAct: jointsForAct,
    recMarkers: recMarkers, recScript: recScript, compareMarkers: compareMarkers,
    conclAvailable: conclAvailable, submitConclusion: submitConclusion,
    factsUnlocked: factsUnlocked, cctvOffset: cctvOffset, timeline: timeline,
    objectives: objectives, currentObjective: currentObjective, useHint: useHint, hintsUsedTotal: hintsUsedTotal,
    queueScene: queueScene, finishScene: finishScene, chooseEnding: chooseEnding,
    switchRole: switchRole, setNotes: setNotes, setSuspect: setSuspect, setSuspectMemo: setSuspectMemo, linkEvidence: linkEvidence, weigh: weigh, sharedVerdicts: sharedVerdicts, tick: tick,
    safeStorage: safeStorage, sanitize: sanitize, serialize: serialize, save: save, load: load,
    loadSettings: loadSettings, saveSettings: saveSettings, resetSave: resetSave
  };
})(typeof window !== 'undefined' ? window : globalThis);
