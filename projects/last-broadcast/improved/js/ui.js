/*
 * 마지막 송출 — 화면
 * 상태는 engine.js가 관리하고, 이 파일은 그리기와 입력만 맡는다.
 * 모든 동적 텍스트는 esc()로 이스케이프한 뒤 넣는다. 사용자 입력(노트·메모)은 value/textContent로만 다룬다.
 */
(function () {
  'use strict';
  var LB = window.LB, C = LB.CASE, E = LB.engine, U = LB.util, A = LB.art, AU = LB.audio;
  var e = U.esc;

  function getLS() { try { return window.localStorage; } catch (x) { return null; } }
  var store = E.safeStorage(getLS());
  var S = null, ST = null, loadInfo = null;

  var ui = {
    atTitle: true, replay: null, sceneLine: 0, modal: null, modalPushed: false, ignorePop: 0,
    cctvIdx: 0, cctvCorr: true, audioSel: 'onair', cmpOther: 't2', cmpOffset: 0, player: null,
    timelineCorr: true, timelineFilter: 'all', evFilter: 'all', drafts: {}, finalDraft: null, lastFocus: null,
    toastTimer: null, dirty: false, lastInv: {}, lastFocusSel: null
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var app = $('#app');
  var modal = $('#modal');
  var handoff = $('#handoff');

  /* ───────── 공통 ───────── */
  /* 다른 탭이 더 새로운 진행을 저장하면 이 탭은 덮어쓰지 않는다 */
  function persist() {
    if (ui.readOnly) return;
    E.save(store, S);
    ui.savedAt = S.updated;
    ui.savedElapsed = S.shared.elapsedMs;
  }
  function persistIfChanged() {
    if (S.updated !== ui.savedAt || S.shared.elapsedMs !== ui.savedElapsed) persist();
  }
  function role() { return S.role; }
  function R() { return S.roles[S.role]; }
  function person(id) { return C.people[id]; }
  function evd(id) { return E.EV[id]; }
  function roleName(r) { return C.people[r].name; }
  function other(r) { return r === 'seoha' ? 'ian' : 'seoha'; }
  function sfx(n) { AU.sfx(n); }
  function plural(n, w) { return n + w; }

  function toast(msg, kind) {
    var box = $('#toasts');
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4200);
  }
  function announce(msg) { var l = $('#live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); }

  var TYPE_LABEL = { photo: '사진', paper: '문서', log: '장비 기록', object: '물건', testimony: '진술', audio: '음원', graph: '센서', cctv: '영상', phone: '통화 기록' };
  var TYPE_ICON = { photo: '▣', paper: '▤', log: '≣', object: '◆', testimony: '❝', audio: '∿', graph: '⌁', cctv: '◉', phone: '☏' };

  /* ───────── 진입 ───────── */
  function boot() {
    ST = E.loadSettings(store);
    AU.configure(ST);
    loadInfo = E.load(store);
    S = loadInfo.state;
    ui.savedAt = S.updated; ui.savedElapsed = S.shared.elapsedMs;
    if (loadInfo.status === 'legacy' || loadInfo.status === 'repaired' || loadInfo.status === 'corrupt') persist();
    bindGlobal();
    render();
    setTimeout(showLoadNotice, 50);
    setInterval(tickTimer, 1000);
  }
  function showLoadNotice() {
    var st = loadInfo.status;
    if (!store.available) {
      openInfo('저장할 수 없는 환경', '<p>이 브라우저에서는 저장소를 쓸 수 없습니다 (사생활 보호 모드나 저장 차단 설정일 수 있습니다). 게임은 할 수 있지만, 창을 닫거나 새로 고치면 진행이 사라집니다.</p>');
    } else if (st === 'corrupt') {
      openInfo('저장 데이터를 읽지 못했습니다', '<p>저장된 진행이 손상되어 새 사건 파일로 시작합니다. 손상된 원본은 지우지 않고 <code>' + e(E.SAVE_KEY) + '.corrupt</code>에 따로 보관했습니다.</p>');
    } else if (st === 'repaired') {
      openInfo('저장 데이터를 복구했습니다', '<p>일부 항목이 손상되었거나 앞뒤가 맞지 않아 제외하고 불러왔습니다. 확인된 진행은 그대로 남아 있습니다.</p><ul class="issues">' +
        loadInfo.issues.slice(0, 6).map(function (i) { return '<li>' + e(i) + '</li>'; }).join('') + (loadInfo.issues.length > 6 ? '<li>외 ' + (loadInfo.issues.length - 6) + '건</li>' : '') + '</ul>');
    } else if (st === 'legacy') {
      openInfo('이전 체험판 기록을 찾았습니다', '<p>사건 구성이 바뀌어 이전 체험판의 진행도는 이어받지 않았습니다.' + (loadInfo.legacyNotes ? ' 역할별 수사 노트 ' + loadInfo.legacyNotes + '개는 새 노트로 옮겼습니다.' : '') + '</p>');
    }
  }
  function tickTimer() {
    if (document.visibilityState !== 'visible' || ui.atTitle) return;
    E.tick(S, 1000);
    var t = $('#timer');
    if (t) t.textContent = fmtElapsed(S.shared.elapsedMs);
    ui.tickCount = (ui.tickCount || 0) + 1;
    if (ui.tickCount % 15 === 0) persistIfChanged();
  }
  function fmtElapsed(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' : '') + (m < 10 && h ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }

  /* ───────── 렌더 ───────── */
  function render(opt) {
    stopPlayer();
    var prevKey = ui.viewKey;
    var html;
    if (ui.replay) html = renderScene(ui.replay.id, true);
    else if (ui.atTitle) html = renderTitle();
    else if (S.phase === 'prologue') html = renderPrologue();
    else if (S.pending.length) html = renderScene(S.pending[0], false);
    else if (S.phase === 'pickrole') html = renderPickRole();
    else if (S.phase === 'ending') html = renderEnding();
    else html = renderPlay();
    app.innerHTML = html;
    afterRender(prevKey, opt || {});
  }
  function afterRender(prevKey, opt) {
    document.body.dataset.role = (ui.atTitle || S.phase !== 'play') ? '' : S.role;
    var af = app.querySelector('[data-autofocus]');
    if (opt.focus) { var f = app.querySelector(opt.focus); if (f) f.focus(); }
    else if (af) af.focus({ preventScroll: true });
    else if (ui.viewKey !== prevKey) {
      var h = app.querySelector('.view-title');
      if (h) h.focus({ preventScroll: true });
    }
    if (ui.viewKey !== prevKey && !opt.keepScroll) window.scrollTo(0, 0);
    mountDynamic();
  }

  /* ───────── 타이틀 ───────── */
  function renderTitle() {
    ui.viewKey = 'title';
    var has = S.phase !== 'title';
    var done = E.conclDone(S, 'FINAL') && S.shared.endingChoice;
    return '<div class="title-screen">' +
      '<div class="title-art">' + A.scene('sceneTitle') + '</div>' +
      '<div class="title-copy">' +
      '<p class="eyebrow">2인 협동 추리 · 사건 파일 001</p>' +
      '<h1 class="game-title view-title" tabindex="-1">마지막 송출</h1>' +
      '<p class="tagline">목소리는 방송에 남았다.<br>그 사람도 그곳에 있었을까.</p>' +
      '<p class="blurb">폐국 두 시간 전, 지역 라디오 해담FM. 1999년 홍수 경보의 진실이 담긴 원본 릴이 금고에서 사라졌다. 현장 기자 서하와 송출실 기술자 이안이 서로 다른 자료를 맞춰 자정 전에 원본을 찾는다.</p>' +
      '<ul class="chips"><li>2인 협동 · 한 기기 번갈아</li><li>혼자 검수 모드</li><li>' + e(C.estimate) + '</li><li>자동 저장</li></ul>' +
      '<div class="title-actions">' +
      (has ? '<button class="btn primary" data-act="continue" data-autofocus>이어하기<span class="sub">' + e(progressLabel()) + '</span></button>' : '') +
      '<button class="btn ' + (has ? '' : 'primary') + '" data-act="new"' + (has ? '' : ' data-autofocus') + '>새 수사 시작</button>' +
      (done ? '<button class="btn" data-act="replay-ending">엔딩 다시 보기</button>' : '') +
      '<button class="btn ghost" data-act="howto">플레이 방법</button>' +
      '<button class="btn ghost" data-act="settings">설정</button>' +
      '</div>' +
      '<label class="switch"><input type="checkbox" data-setting="sound"' + (ST.sound ? ' checked' : '') + '><span>효과음 켜기 <small>시작 버튼을 누른 뒤에만 재생</small></span></label>' +
      '<p class="fineprint">' + e(C.credits) + ' 원격 두 기기 동기화는 지원하지 않습니다.</p>' +
      '</div></div>';
  }
  function progressLabel() {
    if (S.phase === 'prologue') return '도입부';
    if (S.phase === 'ending') return '엔딩';
    var a = C.acts[E.act(S) - 1];
    return a.id + '막 · ' + a.title + (S.mode === 'solo' ? ' · 검수' : ' · 2인');
  }

  /* ───────── 도입부 ───────── */
  function renderPrologue() {
    ui.viewKey = 'prologue';
    return renderSceneBeats(C.scenes.prologue, S.prologueStep, 'prologue', false);
  }
  function renderScene(id, replay) {
    ui.viewKey = 'scene:' + id;
    var beats = C.scenes[id];
    var idx = replay ? ui.replay.beat : (ui.sceneBeat && ui.sceneBeat.id === id ? ui.sceneBeat.beat : 0);
    return renderSceneBeats(beats, idx, id, replay);
  }
  /* 조건이 붙은 대사는 플레이 중 확보한 사실이 있을 때만 나온다 */
  function beatLines(b) { return b.lines.filter(function (l) { return !l[2] || E.check(S, l[2]); }); }
  function renderSceneBeats(beats, idx, id, replay) {
    idx = Math.min(idx, beats.length - 1);
    var b = Object.assign({}, beats[idx]);
    b.lines = beatLines(beats[idx]);
    var lineMax = ui.sceneLine;
    var lines = b.lines.slice(0, Math.max(1, lineMax + 1));
    var allShown = lines.length >= b.lines.length;
    var actionDone = !b.action || actionTaken(b, replay);
    var isChoice = !!b.choice;
    var lastBeat = idx >= beats.length - 1;
    var html = '<div class="scene" data-scene="' + e(id) + '">' +
      '<div class="scene-art">' + A.scene(b.art) + '</div>' +
      '<div class="scene-panel">' +
      '<div class="scene-head"><span class="scene-time">' + e(b.time) + '</span><span class="scene-place">' + e(b.place) + '</span>' +
      '<span class="scene-count">' + (idx + 1) + ' / ' + beats.length + '</span></div>' +
      '<h1 class="sr-only view-title" tabindex="-1">' + e(sceneTitle(id)) + '</h1>' +
      '<ol class="lines" aria-live="polite">' + lines.map(function (l) { return lineHtml(l); }).join('') + '</ol>';
    if (b.action && allShown && !actionDone) {
      html += '<div class="scene-actions"><button class="btn primary" data-act="scene-action" data-autofocus>' + e(b.action.label) + '</button></div>';
    } else if (b.action && actionDone && allShown) {
      html += '<p class="after">' + e(b.action.after) + '</p>';
    }
    if (isChoice && allShown && !replay) {
      html += '<div class="scene-actions choice">' + b.choice.map(function (c, i) {
        return '<button class="btn ' + (i === 0 ? 'primary' : '') + '" data-act="scene-choice" data-id="' + e(c.id) + '"' + (i === 0 ? ' data-autofocus' : '') + '>' + e(c.label) + '</button>';
      }).join('') + '</div>';
    } else if (!(b.action && allShown && !actionDone)) {
      html += '<div class="scene-actions"><button class="btn primary" data-act="scene-next" data-autofocus>' +
        (allShown ? (lastBeat ? (replay ? '닫기' : (id === 'prologue' ? '수사 시작' : '계속')) : '다음 장면') : '다음') + ' <span aria-hidden="true">›</span></button></div>';
    }
    html += '<div class="scene-foot">' +
      (!isChoice || replay ? '<button class="btn small ghost" data-act="scene-skip">' + (replay ? '다시 보기 닫기' : '장면 건너뛰기') + '</button>' : '') +
      '<span class="kbd-hint">Enter · Space: 다음</span></div>' +
      '</div></div>';
    return html;
  }
  function sceneTitle(id) {
    return { prologue: '도입부', act2: '2막 · 목소리의 빈자리', act3: '3막 · 마지막 송출', found: '원본 발견', confront: '대면', ending_seal: '엔딩', ending_air: '엔딩' }[id] || '장면';
  }
  function lineHtml(l) {
    var who = l[0], text = l[1];
    if (who === 'narr') return '<li class="line narr">' + e(text) + '</li>';
    if (who === 'radio') return '<li class="line radio"><span class="who">스피커</span>' + e(text) + '</li>';
    var p = person(who);
    return '<li class="line say ' + e(who) + '"><span class="who">' + e(p.name) + '</span><span class="said">' + e(text) + '</span></li>';
  }
  function actionTaken(b, replay) {
    if (replay) return true;
    var spec = b.action.grant;
    return E.ROLES.every(function (r) { return !spec[r] || spec[r].every(function (id) { return E.hasFound(S, id); }); });
  }
  function currentBeats() {
    if (ui.replay) return { beats: C.scenes[ui.replay.id], id: ui.replay.id, idx: ui.replay.beat };
    if (S.phase === 'prologue') return { beats: C.scenes.prologue, id: 'prologue', idx: S.prologueStep };
    var id = S.pending[0];
    if (!id) return null;
    if (!ui.sceneBeat || ui.sceneBeat.id !== id) ui.sceneBeat = { id: id, beat: 0 };
    return { beats: C.scenes[id], id: id, idx: ui.sceneBeat.beat };
  }
  function sceneNext(skipAll) {
    var cb = currentBeats(); if (!cb) return;
    var b0 = cb.beats[Math.min(cb.idx, cb.beats.length - 1)];
    var b = Object.assign({}, b0, { lines: beatLines(b0) });
    if (!skipAll && ui.sceneLine < b.lines.length - 1) { ui.sceneLine++; sfx('click'); render({ keepScroll: true }); return; }
    if (b.action && !actionTaken(b, !!ui.replay)) {
      if (!skipAll) { ui.sceneLine = b.lines.length - 1; render({ keepScroll: true }); return; }
    }
    if (skipAll) {
      // 건너뛰어도 장면이 주는 증거는 모두 받는다
      if (!ui.replay) cb.beats.forEach(function (bb) { if (bb.action) E.grantSpec(S, bb.action.grant); });
      if (b.choice && !ui.replay) { ui.sceneLine = b.lines.length - 1; jumpToBeat(cb, cb.beats.length - 1); return; }
      endScene(cb);
      return;
    }
    if (cb.idx < cb.beats.length - 1) { jumpToBeat(cb, cb.idx + 1); if (cb.beats[cb.idx + 1].sfx) sfx(cb.beats[cb.idx + 1].sfx === 'shutter' ? 'rumble' : cb.beats[cb.idx + 1].sfx); return; }
    endScene(cb);
  }
  function jumpToBeat(cb, n) {
    ui.sceneLine = 0;
    if (ui.replay) ui.replay.beat = n;
    else if (cb.id === 'prologue') S.prologueStep = n;
    else ui.sceneBeat = { id: cb.id, beat: n };
    persist();
    render();
  }
  function endScene(cb) {
    ui.sceneLine = 0;
    if (ui.replay) {
      var next = ui.replay.queue.shift();
      if (next) { ui.replay.id = next; ui.replay.beat = 0; } else { ui.replay = null; ui.atTitle = ui.replayFromTitle; }
      render(); return;
    }
    if (cb.id === 'prologue') {
      S.prologueStep = C.scenes.prologue.length;
      S.phase = 'pickrole';
      persist(); render(); return;
    }
    E.finishScene(S, cb.id);
    ui.sceneBeat = null;
    persist();
    if (cb.id === 'act2' || cb.id === 'act3') toast(C.acts[E.act(S) - 1].id + '막 · ' + C.acts[E.act(S) - 1].title + ' — 새 자료가 열렸습니다.', 'good');
    render();
  }
  function sceneAction() {
    var cb = currentBeats(); if (!cb) return;
    var b = cb.beats[cb.idx];
    if (!b.action) return;
    E.grantSpec(S, b.action.grant);
    sfx(b.action.sfx || 'click');
    persist();
    render({ keepScroll: true });
  }
  function sceneChoice(id) {
    if (!E.chooseEnding(S, id)) return;
    E.finishScene(S, 'confront');
    ui.sceneBeat = null; ui.sceneLine = 0;
    persist(); sfx('tape'); render();
  }

  /* ───────── 역할 선택 ───────── */
  function renderPickRole() {
    ui.viewKey = 'pickrole';
    var solo = S.mode === 'solo';
    return '<div class="pick">' +
      '<h1 class="view-title" tabindex="-1">누가 먼저 조사할까요?</h1>' +
      '<p class="lead">' + (solo ? '검수 모드입니다. 두 역할을 상단 버튼으로 바로 오갈 수 있습니다.' : '한 기기를 번갈아 씁니다. 지금 화면을 볼 사람이 고르세요. 상대는 잠시 화면을 보지 않는 편이 좋습니다.') + '</p>' +
      '<div class="pick-grid">' + ['seoha', 'ian'].map(function (r) {
        var p = person(r);
        return '<button class="pick-card ' + r + '" data-act="start-role" data-role="' + r + '"' + (r === 'seoha' ? ' data-autofocus' : '') + '>' +
          A.portrait(r, 72) + '<span class="pick-name">' + e(p.name) + ' <small>' + e(p.role) + '</small></span>' +
          '<span class="pick-desc">' + e(C.roles[r].hint) + '</span><span class="pick-go">' + e(U.josa(p.name, '으로/로')) + ' 시작 →</span></button>';
      }).join('') + '</div>' +
      '<p class="fineprint">각 역할의 자료는 상대 화면에 나오지 않습니다. 필요한 정보는 말로 설명하세요.</p></div>';
  }

  /* ───────── 수사 화면 ───────── */
  var NAV = [
    { id: 'inv', label: '조사', icon: '⌖' },
    { id: 'evidence', label: '증거함', icon: '▤' },
    { id: 'timeline', label: '시간표', icon: '⏱' },
    { id: 'board', label: '사건 보드', icon: '⊞' },
    { id: 'notes', label: '노트', icon: '✎' }
  ];
  function view() {
    var v = R().view;
    if (!v || !v.name) v = R().view = { name: role() === 'seoha' ? 'map' : 'bms', param: null };
    if (v.name === 'loc' && !E.locationUnlocked(S, v.param)) v = R().view = { name: 'map', param: null };
    if (v.name === 'person' && !C.people[v.param]) v = R().view = { name: 'talk', param: null };
    return v;
  }
  function navGroup(name) {
    if (['map', 'loc', 'talk', 'person', 'bms', 'sensors', 'audio', 'docs'].indexOf(name) >= 0) return 'inv';
    return name;
  }
  function renderPlay() {
    var v = view();
    ui.viewKey = S.role + ':' + v.name + ':' + (v.param || '');
    var main = renderView(v);
    var a = C.acts[E.act(S) - 1];
    var obj = E.currentObjective(S);
    var unread = E.unreadCount(S, S.role);
    var grp = navGroup(v.name);
    var p = person(S.role);
    var top = '<header class="topbar">' +
      '<button class="brand" data-act="to-title" aria-label="타이틀 화면으로">마지막 송출</button>' +
      '<div class="act-chip"><span>' + a.id + '막</span> ' + e(a.title) + '</div>' +
      '<div class="role-chip ' + S.role + '" aria-label="현재 역할">' + A.portrait(S.role, 28) + '<span>' + e(p.name) + '<small>' + e(C.roles[S.role].desk) + '</small></span></div>' +
      '<div class="top-actions">' +
      (ST.showTimer ? '<span class="timer" title="경과 시간 (선택 표시)"><span class="sr-only">경과 시간 </span><span id="timer">' + fmtElapsed(S.shared.elapsedMs) + '</span></span>' : '') +
      '<button class="btn small swap" data-act="switch-role"><span class="sw-long">' + (S.mode === 'solo' ? '역할 전환' : '역할 넘기기') + '</span><span class="sw-short" aria-hidden="true">' + (S.mode === 'solo' ? '전환' : '넘기기') + '</span> <span aria-hidden="true">⇄</span><span class="sr-only"> (' + e(roleName(other(S.role))) + '에게)</span></button>' +
      '<button class="btn small icon" data-act="settings" aria-label="메뉴와 설정">☰</button>' +
      '</div></header>';
    var objbar = '<div class="objective" role="region" aria-label="현재 목표">' +
      '<div class="obj-text"><span class="obj-label">현재 목표</span>' + (obj ? e(obj.label) : '보고서 제출 완료') +
      (obj ? '<span class="obj-guide">' + e(obj.guide[S.role]) + '</span>' : '') + '</div>' +
      (obj && C.hints[obj.id] ? '<button class="btn small" data-act="hint" data-id="' + e(obj.id) + '">힌트 <span class="hint-dots" aria-hidden="true">' + hintDots(obj.id) + '</span></button>' : '') +
      '</div>';
    var nav = '<nav class="nav" aria-label="수사 메뉴"><ul>' + NAV.map(function (n) {
      var badge = n.id === 'evidence' && unread ? '<span class="badge" aria-label="미확인 ' + unread + '개">' + unread + '</span>' : '';
      if (n.id === 'board') { var nb = boardBadge(); if (nb) badge = '<span class="badge dot" aria-label="진행할 일 있음"></span>'; }
      return '<li><button data-act="nav" data-view="' + n.id + '"' + (grp === n.id ? ' aria-current="page" class="on"' : '') + '><span class="ni" aria-hidden="true">' + n.icon + '</span><span class="nl">' + n.label + '</span>' + badge + '</button></li>';
    }).join('') + '</ul></nav>';
    var rail = '<aside class="rail" aria-label="진행 상황">' + renderChecklist() + '</aside>';
    var solo = S.mode === 'solo' ? '<p class="solo-banner">검수 모드 · 두 역할의 자료를 혼자 확인합니다. 협동 플레이에서는 상대 자료를 말로만 전해 듣습니다.</p>' : '';
    return top + objbar + '<div class="layout">' + nav + '<main id="main" class="stage" tabindex="-1">' + solo + main + '</main>' + rail + '</div>';
  }
  function hintDots(id) {
    var used = S.shared.hints[id] || 0;
    return [1, 2, 3].map(function (i) { return i <= used ? '●' : '○'; }).join('');
  }
  function boardBadge() {
    var n = E.act(S);
    var j = E.jointsForAct(S, n).some(function (id) { return C.joints[id].by === S.role && E.jointAvailable(S, id) && !E.jointDone(S, id); });
    var c = Object.keys(C.conclusions).some(function (id) { return E.conclAvailable(S, id) && !E.conclDone(S, id); });
    return j || c;
  }
  function renderChecklist() {
    var list = E.objectives(S);
    var n = E.act(S);
    return '<section class="checklist"><h2>' + n + '막 할 일</h2><ol>' + list.map(function (o) {
      return '<li class="' + (o.done ? 'done' : '') + '"><span class="ck" aria-hidden="true">' + (o.done ? '✓' : '') + '</span><span>' + e(o.obj.label) + '<span class="sr-only">' + (o.done ? ' (완료)' : ' (진행 중)') + '</span></span></li>';
    }).join('') + '</ol>' +
      '<div class="acts">' + C.acts.map(function (a) { return '<span class="' + (a.id < n ? 'past' : a.id === n ? 'now' : '') + '">' + a.id + '</span>'; }).join('') + '</div>' +
      '<p class="partner-note">' + e(roleName(other(S.role))) + '의 자료는 이 화면에 나오지 않습니다.</p></section>';
  }
  function renderView(v) {
    switch (v.name) {
      case 'map': return viewMap();
      case 'loc': return viewLoc(v.param);
      case 'talk': return viewTalk();
      case 'person': return viewPerson(v.param);
      case 'bms': return viewBms(v.param);
      case 'sensors': return viewSensors();
      case 'audio': return viewAudio();
      case 'docs': return viewDocs();
      case 'evidence': return viewEvidence();
      case 'timeline': return viewTimeline();
      case 'board': return viewBoard();
      case 'notes': return viewNotes();
    }
    return '';
  }
  function invTabs(cur) {
    var tabs = S.role === 'seoha'
      ? [['map', '평면도'], ['talk', '인터뷰']]
      : [['bms', '건물 기록'], ['sensors', '센서'], ['audio', '음원'], ['docs', '수신함·대장']];
    return '<div class="tabs" role="tablist" aria-label="조사 도구">' + tabs.map(function (t) {
      var on = cur === t[0];
      return '<button role="tab" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '" data-act="go" data-view="' + t[0] + '">' + t[1] + newDot(t[0]) + '</button>';
    }).join('') + '</div>';
  }
  function newDot(name) {
    if (name === 'talk') return C.topics.some(function (t) { return E.topicUnlocked(S, t.id) && !E.hasFound(S, t.id); }) ? '<span class="dot" aria-label="새 질문"></span>' : '';
    if (name === 'docs') return C.stations.docs.items.some(function (it) { return E.stationItemUnlocked(S, it) && !R().read[it.ev]; }) ? '<span class="dot" aria-label="새 문서"></span>' : '';
    if (name === 'audio') return E.audioLibrary(S).some(function (it) { return !R().read[it.ev]; }) ? '<span class="dot" aria-label="새 음원"></span>' : '';
    if (name === 'bms') return C.stations.bms.tabs.some(function (t) { return !R().read[t.ev]; }) ? '<span class="dot" aria-label="미확인 기록"></span>' : '';
    if (name === 'sensors') return !R().read.i_loggers ? '<span class="dot" aria-label="미확인"></span>' : '';
    return '';
  }
  function jointButton(id, label) {
    var j = C.joints[id];
    if (!E.jointAvailable(S, id) && !E.jointDone(S, id)) return '';
    if (j.by !== S.role) return '';
    var done = E.jointDone(S, id);
    return '<button class="btn joint-btn ' + (done ? 'done' : '') + '" data-act="joint" data-id="' + id + '"><span class="jb-tag">공동 분석</span>' + e(label || j.title) + (done ? ' <span aria-hidden="true">✓</span><span class="sr-only">완료</span>' : '') + '</button>';
  }

  /* 서하: 평면도 */
  function viewMap() {
    var floors = C.floors.map(function (f) {
      var cells = f.cells.map(function (c) {
        var style = 'grid-column:' + c.c + ' / span ' + c.w + ';grid-row:' + c.r + ' / span ' + c.h;
        if (!c.loc) return '<div class="cell static ' + (c.kind || '') + '" style="' + style + '"><span>' + e(c.label) + '</span></div>';
        var L = C.locations[c.loc], info = E.locationInfo(S, c.loc);
        var status = !info.unlocked ? '잠김' : info.fresh ? '새 단서 ' + info.fresh : (info.done ? '모두 조사' : '');
        var cls = 'cell room' + (!info.unlocked ? ' locked' : '') + (info.unlocked && info.fresh ? ' fresh' : '') + (info.unlocked && !info.fresh && info.done ? ' cleared' : '');
        return '<button class="' + cls + '" style="' + style + '" data-act="loc" data-id="' + c.loc + '">' +
          '<span class="rn">' + e(L.name) + '</span><span class="rs">' + (!info.unlocked ? '<span aria-hidden="true">🔒</span> ' : '') + e(status) + '</span></button>';
      }).join('');
      return '<section class="floor"><h3 class="floor-label">' + e(f.label) + '</h3><div class="floor-grid" style="grid-template-columns:repeat(' + f.cols + ',1fr);grid-template-rows:repeat(' + f.rows + ',minmax(64px,auto))">' + cells + '</div></section>';
    }).join('');
    return invTabs('map') + '<h2 class="view-title" tabindex="-1">해담FM 평면도</h2>' +
      '<p class="view-sub">조사할 곳을 고르세요. 숫자는 아직 살펴보지 않은 곳의 수입니다. 송출실은 이안의 자리입니다.</p>' +
      '<div class="blueprint">' + floors + '</div>';
  }
  function viewLoc(lid) {
    var L = C.locations[lid];
    var hs = L.hotspots;
    var ex = R().examined;
    var pins = hs.map(function (h, i) {
      var open = E.hotspotUnlocked(S, h.id);
      if (!open) return '';
      return '<button class="pin' + (ex[h.id] ? ' seen' : '') + '" style="left:' + h.x + '%;top:' + h.y + '%" data-act="hotspot" data-id="' + h.id + '" aria-label="' + e(h.label) + (ex[h.id] ? ' (살펴봄)' : ' (새로)') + '"><span class="pn">' + (i + 1) + '</span><span class="pl">' + e(h.label) + '</span></button>';
    }).join('');
    var list = hs.map(function (h, i) {
      var open = E.hotspotUnlocked(S, h.id);
      if (!open) return h.lockedHint ? '<li><div class="spot locked"><span class="pn">' + (i + 1) + '</span><span class="sl">' + e(h.label) + '<small>' + e(h.lockedHint) + '</small></span></div></li>' : '';
      return '<li><button class="spot' + (ex[h.id] ? ' seen' : '') + '" data-act="hotspot" data-id="' + h.id + '"><span class="pn">' + (i + 1) + '</span><span class="sl">' + e(h.label) + '<small>' + (ex[h.id] ? '살펴봄 · 다시 보기' : '아직 살펴보지 않음') + '</small></span><span aria-hidden="true">›</span></button></li>';
    }).join('');
    return '<div class="crumb"><button class="btn small ghost" data-act="back">← 평면도</button><span>' + e(floorName(L.floor)) + '</span></div>' +
      '<h2 class="view-title" tabindex="-1">' + e(L.name) + '</h2><p class="view-sub">' + e(L.desc) + '</p>' +
      '<div class="scene-view"><div class="scene-art">' + A.scene(L.art) + '</div>' + pins + '</div>' +
      '<ul class="spots">' + list + '</ul>';
  }
  function floorName(f) { return { roof: '옥상', '2F': '2층', '1F': '1층', B1: '지하 1층' }[f] || f; }

  /* 서하: 인터뷰 */
  function viewTalk() {
    var cards = ['yoon', 'han', 'min'].map(function (w) {
      var p = person(w), ts = E.topicsFor(S, w);
      var fresh = ts.filter(function (t) { return t.unlocked && !t.asked; }).length;
      return '<li><button class="person-card" data-act="person" data-id="' + w + '">' + A.portrait(w, 64) +
        '<span class="pc-body"><span class="pc-name">' + e(p.name) + ' <small>' + e(p.role) + '</small></span><span class="pc-bio">' + e(p.bio) + '</span>' +
        '<span class="pc-status">' + (fresh ? '<span class="badge">' + fresh + '</span> 새 질문' : '물어볼 것을 모두 물었다') + '</span></span></button></li>';
    }).join('');
    return invTabs('talk') + '<h2 class="view-title" tabindex="-1">인터뷰</h2><p class="view-sub">사건이 진행되면 새 질문이 생깁니다. 답변은 진술 증거로 증거함에 남습니다.</p><ul class="people">' + cards + '</ul>';
  }
  function viewPerson(w) {
    var p = person(w), ts = E.topicsFor(S, w);
    var asked = ts.filter(function (t) { return t.asked; });
    var fresh = ts.filter(function (t) { return t.unlocked && !t.asked; });
    var log = asked.map(function (t) {
      var tp = t.topic;
      return '<li class="qa"><p class="q"><span class="who">서하</span>' + e(tp.q) + '</p>' +
        tp.a.map(function (a) { return '<p class="a"><span class="who">' + e(p.name) + '</span>' + e(a) + '</p>'; }).join('') +
        (tp.note ? '<p class="obs">' + e(tp.note) + '</p>' : '') +
        ((tp.grants || []).length ? '<p class="got">증거 확보: ' + tp.grants.map(function (g) { return '<button class="chip-btn" data-act="open-ev" data-id="' + g + '">' + e(evd(g).title) + '</button>'; }).join(' ') + '</p>' : '') + '</li>';
    }).join('');
    return '<div class="crumb"><button class="btn small ghost" data-act="back">← 인터뷰</button></div>' +
      '<div class="person-head">' + A.portrait(w, 88) + '<div><h2 class="view-title" tabindex="-1">' + e(p.name) + '</h2><p class="pc-role">' + e(p.role) + '</p><p class="view-sub">' + e(p.bio) + '</p></div></div>' +
      '<section class="ask"><h3>물어볼 것</h3>' + (fresh.length ? '<ul class="topics">' + fresh.map(function (t) {
        return '<li><button class="topic" data-act="ask" data-id="' + t.topic.id + '">' + e(t.topic.q) + '</button></li>';
      }).join('') + '</ul>' : '<p class="muted">지금은 더 물어볼 것이 없다. 새로운 사실을 알게 되면 질문이 생긴다.</p>') + '</section>' +
      (log ? '<section class="transcript"><h3>나눈 이야기</h3><ol class="qalog">' + log + '</ol></section>' : '');
  }

  /* 이안: 건물 기록 */
  function viewBms(tab) {
    var tabs = C.stations.bms.tabs;
    tab = tabs.some(function (t) { return t.id === tab; }) ? tab : tabs[0].id;
    var t = tabs.filter(function (x) { return x.id === tab; })[0];
    E.openRecord(S, t.ev); E.markRead(S, 'ian', t.ev);
    var actions = (C.stations.bms.actions || []).filter(function (a) { return E.check(S, a.unlock); }).map(function (a) {
      var done = !!S.shared.flags[a.flag];
      return '<button class="btn ' + (done ? 'done' : 'warn') + '" data-act="bms-action" data-id="' + a.id + '"' + (done ? ' disabled' : '') + '>' + e(a.label) + (done ? ' ✓' : '') + '</button>';
    }).join('');
    return invTabs('bms') + '<h2 class="view-title" tabindex="-1">건물 관리 기록</h2><p class="view-sub">건물 관리 서버의 시각은 표준시입니다.</p>' +
      '<div class="subtabs" role="tablist" aria-label="기록 종류">' + tabs.map(function (x) {
        return '<button role="tab" aria-selected="' + (x.id === tab) + '" class="' + (x.id === tab ? 'on' : '') + '" data-act="bms-tab" data-id="' + x.id + '">' + e(x.label) + (R().read[x.ev] ? '' : '<span class="dot"></span>') + '</button>';
      }).join('') + '</div>' +
      '<div class="term">' + renderLog(evd(t.ev)) + '</div>' +
      '<div class="tool-row">' + jointButton('J1', '영상 시각 보정') + actions + '</div>';
  }
  /* 이안: 센서 */
  function viewSensors() {
    E.openRecord(S, 'i_loggers'); E.markRead(S, 'ian', 'i_loggers');
    return invTabs('sensors') + '<h2 class="view-title" tabindex="-1">센서 기록계</h2><p class="view-sub">' + e(C.loggers.note) + '</p>' +
      renderLoggers(true) + '<div class="tool-row">' + jointButton('J2', '금고 안 기록계 지정') + '</div>';
  }
  /* 이안: 음원 */
  function viewAudio() {
    var lib = E.audioLibrary(S);
    lib.forEach(function (it) { E.openRecord(S, it.ev); });
    if (!lib.some(function (it) { return evd(it.ev).rec === ui.audioSel; })) ui.audioSel = 'onair';
    var sel = ui.audioSel;
    E.markRead(S, 'ian', lib.filter(function (it) { return evd(it.ev).rec === sel; })[0].ev);
    var files = '<ul class="files" role="listbox" aria-label="음원 목록">' + lib.map(function (it) {
      var ev = evd(it.ev), rec = C.recordings[ev.rec];
      return '<li><button class="file' + (sel === ev.rec ? ' on' : '') + '" data-act="rec-select" data-id="' + ev.rec + '" aria-pressed="' + (sel === ev.rec) + '">' +
        '<span class="fn">' + e(rec.file) + (R().read[it.ev] ? '' : ' <span class="dot"></span>') + '</span><span class="fd">' + e(rec.label) + ' · ' + U.mmss(rec.dur) + '</span></button></li>';
    }).join('') + '</ul>';
    var cmp = '';
    if (E.conclDone(S, 'IC1')) {
      var others = lib.map(function (it) { return evd(it.ev).rec; }).filter(function (r) { return r !== 'onair'; });
      if (others.indexOf(ui.cmpOther) < 0) ui.cmpOther = others[0];
      var m = E.compareMarkers('onair', ui.cmpOther, ui.cmpOffset);
      cmp = '<section class="compare" aria-labelledby="cmpH"><h3 id="cmpH">음원 비교</h3>' +
        '<p class="view-sub">위: 송출 감시 녹음 (21:44:30 시작). 아래 파일을 밀어서 표시가 겹치는지 보세요.</p>' +
        '<label class="field inline">비교할 파일 <select data-act="cmp-file">' + others.map(function (r) {
          return '<option value="' + r + '"' + (r === ui.cmpOther ? ' selected' : '') + '>' + e(C.recordings[r].file) + '</option>';
        }).join('') + '</select></label>' +
        '<div class="cmp-stage">' + waveSvg('onair', { compact: true }) + waveSvg(ui.cmpOther, { compact: true, offset: ui.cmpOffset, baseDur: C.recordings.onair.dur, id: 'cmpWave' }) + '</div>' +
        '<label class="field slider">아래 파일 시작 위치: <output id="cmpOut">' + ui.cmpOffset.toFixed(1) + '초</output>' +
        '<input type="range" min="0" max="60" step="0.5" value="' + ui.cmpOffset + '" data-act="cmp-offset" aria-describedby="cmpMatch"></label>' +
        '<div class="cmp-nudge"><button class="btn small" data-act="cmp-nudge" data-d="-1">−1초</button><button class="btn small" data-act="cmp-nudge" data-d="-0.5">−0.5</button><button class="btn small" data-act="cmp-nudge" data-d="0.5">+0.5</button><button class="btn small" data-act="cmp-nudge" data-d="1">+1초</button></div>' +
        '<p class="cmp-match" id="cmpMatch" aria-live="polite">겹친 표시 <strong>' + m.matched + ' / ' + m.total + '</strong></p>' +
        (E.jointDone(S, 'MATCH') ? '<p class="ok-line">✓ 대조 결과 등록됨 — 송출 = REC_1800_T2</p>' : '<button class="btn primary" data-act="match-submit">이 위치로 대조 결과 등록</button>') +
        '<div id="matchMsg" class="fb" role="alert"></div></section>';
    }
    return invTabs('audio') + '<h2 class="view-title" tabindex="-1">음원 작업대</h2><p class="view-sub">' + e(C.audioNote) + (AU.active() ? '' : ' 지금은 효과음이 꺼져 있어 무음으로 재생됩니다.') + '</p>' +
      '<div class="audio-grid">' + files + '<div class="player">' + renderPlayer(sel) + '</div></div>' +
      '<div class="tool-row">' + jointButton('J3', '금속음의 출처 판단') + '</div>' + cmp;
  }
  function renderPlayer(recId) {
    var rec = C.recordings[recId];
    var script = E.recScript(recId), marks = E.recMarkers(recId);
    var items = script.map(function (s) { return { t: s[0], kind: 'line', text: s[1] }; })
      .concat(marks.map(function (m) { return { t: m[0], kind: 'mark', text: '[' + C.markerLabels[m[1]] + ']' }; }));
    rec.segments.forEach(function (sg) { if (sg[2] === 'music') items.push({ t: sg[0], kind: 'mark', text: '[음악]' }); });
    items.sort(function (a, b) { return a.t - b.t; });
    var startStd = rec.start ? U.toSec(rec.start) : null;
    return '<div class="player-head"><strong>' + e(rec.file) + '</strong><span>' + e(rec.label) + '</span></div>' +
      waveSvg(recId, { id: 'mainWave' }) +
      '<div class="transport"><button class="btn small" data-act="rec-play" id="playBtn">▶ 재생</button>' +
      '<button class="btn small" data-act="rec-stop">■ 정지</button>' +
      '<span class="ptime" id="ptime">00:00' + (startStd !== null ? ' · ' + rec.start : '') + '</span></div>' +
      '<ol class="script" id="script">' + items.map(function (it) {
        return '<li class="' + it.kind + '" data-t="' + it.t + '"><button class="ts" data-act="rec-seek" data-t="' + it.t + '">' + U.mmss(it.t) + (startStd !== null ? '<small>' + U.fmt(startStd + it.t) + '</small>' : '') + '</button><span>' + e(it.text) + '</span></li>';
      }).join('') + '</ol>';
  }
  function waveSvg(recId, opt) {
    opt = opt || {};
    var rec = C.recordings[recId], data = A.waveform(recId);
    var W = 1000, H = opt.compact ? 70 : 110, mid = H / 2;
    var dur = opt.baseDur || rec.dur;
    var pps = W / dur;
    var off = (opt.offset || 0) * pps;
    var d = '';
    for (var i = 0; i < data.length; i += (data.length > 900 ? 2 : 1)) {
      var x = (i / 4) * pps + off;
      if (x > W) break;
      var a = data[i] * (mid - 6);
      d += 'M' + x.toFixed(1) + ' ' + (mid - a).toFixed(1) + 'V' + (mid + a).toFixed(1);
    }
    var marks = E.recMarkers(recId).map(function (m) {
      var x = m[0] * pps + off;
      var col = m[1] === 'clank' ? '#e8a63a' : m[1] === 'page' ? '#6fb6c6' : '#d65a43';
      return '<g><line x1="' + x + '" x2="' + x + '" y1="0" y2="' + H + '" stroke="' + col + '" stroke-width="2" opacity=".9"/><circle cx="' + x + '" cy="6" r="5" fill="' + col + '"/></g>';
    }).join('');
    var ticks = '';
    for (var s = 0; s <= dur; s += 30) ticks += '<line x1="' + s * pps + '" x2="' + s * pps + '" y1="' + (H - 6) + '" y2="' + H + '" stroke="#56646d"/>';
    return '<div class="wave' + (opt.compact ? ' compact' : '') + '"' + (opt.id ? ' id="' + opt.id + '"' : '') + '><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + e(rec.file) + ' 파형. 표시: ' + markerSummary(recId) + '">' +
      '<rect width="' + W + '" height="' + H + '" fill="#0c1216"/><path d="' + d + '" stroke="#6fb6c6" stroke-width="1.6" opacity=".75"/>' + ticks + marks +
      (opt.compact ? '' : '<line class="playhead" x1="0" x2="0" y1="0" y2="' + H + '" stroke="#fff" stroke-width="2"/>') + '</svg>' +
      '<div class="wave-legend"><span class="lg clank">● 금속음</span><span class="lg cough">● 기침</span><span class="lg page">● 종이</span></div></div>';
  }
  function markerSummary(recId) {
    var m = E.recMarkers(recId);
    if (!m.length) return '없음';
    return m.map(function (x) { return U.mmss(x[0]) + ' ' + C.markerLabels[x[1]]; }).join(', ');
  }
  /* 이안: 수신함·대장 */
  function viewDocs() {
    var items = C.stations.docs.items.filter(function (it) { return E.stationItemUnlocked(S, it); });
    items.forEach(function (it) { E.openRecord(S, it.ev); });
    var list = items.map(function (it) {
      var ev = evd(it.ev);
      return '<li><button class="doc-row' + (R().read[it.ev] ? '' : ' fresh') + '" data-act="open-ev" data-id="' + it.ev + '"><span class="ti">' + TYPE_ICON[ev.type] + '</span><span class="dr-body"><span class="dr-title">' + e(ev.title) + (R().read[it.ev] ? '' : ' <span class="new">새로</span>') + '</span><span class="dr-short">' + e(ev.short) + '</span></span><span aria-hidden="true">›</span></button></li>';
    }).join('');
    var hits = R().registryHits.map(function (no) { return C.registry.filter(function (r) { return r.no === no; })[0]; });
    return invTabs('docs') + '<h2 class="view-title" tabindex="-1">수신함 · 대장</h2>' +
      '<ul class="docs">' + list + '</ul>' +
      '<div class="tool-row">' + jointButton('J4', '제보 전화 대조') + jointButton('J6', '원본 대조') + '</div>' +
      '<section class="registry"><h3>자료 대장 검색</h3><form data-form="registry" class="reg-form"><label class="field">등록번호·펀칭·제목 (4자 이상)<input name="q" autocomplete="off" maxlength="30" placeholder="예: 990803"></label><button class="btn">검색</button></form>' +
      '<div id="regResult" role="status">' + (hits.length ? registryTable(hits) : '<p class="muted">검색한 항목이 여기에 남습니다.</p>') + '</div></section>';
  }
  function registryTable(hits) {
    return '<div class="term"><table class="log"><thead><tr><th>등록번호</th><th>제목</th><th>규격</th><th>위치</th><th>리더 펀칭</th></tr></thead><tbody>' + hits.map(function (r) {
      return '<tr><td>' + e(r.no) + '</td><td>' + e(r.title) + '</td><td>' + e(r.spec) + '</td><td>' + e(r.place) + '</td><td>' + e(r.punch) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  /* 증거함 */
  function viewEvidence() {
    var r = R();
    var ids = Object.keys(r.found).sort(function (a, b) { return r.found[b] - r.found[a]; });
    var types = {};
    ids.forEach(function (id) { types[evd(id).type] = true; });
    var f = ui.evFilter;
    var shown = ids.filter(function (id) { return f === 'all' ? true : f === 'unread' ? !r.read[id] : evd(id).type === f; });
    var filters = [['all', '전체 ' + ids.length], ['unread', '미확인 ' + E.unreadCount(S, S.role)]].concat(Object.keys(types).map(function (t) { return [t, TYPE_LABEL[t]]; }));
    return '<h2 class="view-title" tabindex="-1">' + e(roleName(S.role)) + '의 증거함</h2>' +
      '<p class="view-sub">' + e(roleName(other(S.role))) + '의 증거는 여기 없습니다. 필요한 내용은 서로 말로 설명하세요.</p>' +
      '<div class="filters" role="group" aria-label="증거 거르기">' + filters.map(function (x) {
        return '<button class="chip-btn' + (f === x[0] ? ' on' : '') + '" aria-pressed="' + (f === x[0]) + '" data-act="ev-filter" data-id="' + x[0] + '">' + e(x[1]) + '</button>';
      }).join('') + '</div>' +
      (shown.length ? '<ul class="ev-grid">' + shown.map(evCard).join('') + '</ul>' : '<p class="muted">해당하는 증거가 없습니다.</p>');
  }
  function evCard(id) {
    var ev = evd(id), unread = !R().read[id];
    var t = (ev.times || [])[0];
    return '<li><button class="ev-card t-' + ev.type + (unread ? ' unread' : '') + '" data-act="open-ev" data-id="' + id + '">' +
      '<span class="ev-type"><span aria-hidden="true">' + TYPE_ICON[ev.type] + '</span> ' + TYPE_LABEL[ev.type] + (t ? ' · ' + e(t.t.slice(0, 5)) : '') + '</span>' +
      '<span class="ev-title">' + e(ev.title) + '</span><span class="ev-short">' + e(ev.short) + '</span>' +
      (unread ? '<span class="new">미확인</span>' : '<span class="read">읽음</span>') + '</button></li>';
  }

  /* 시간표 */
  function viewTimeline() {
    var off = E.cctvOffset(S);
    var corr = ui.timelineCorr && off !== null;
    var items = E.timeline(S, S.role, corr);
    var f = ui.timelineFilter;
    if (f === 'key') items = items.filter(function (i) { return i.sec >= U.toSec('21:38:00') && i.sec <= U.toSec('21:58:00'); });
    if (f === 'shared') items = items.filter(function (i) { return i.clock === 'shared'; });
    var ruler = rulerSvg(E.timeline(S, S.role, corr));
    return '<h2 class="view-title" tabindex="-1">시간표</h2>' +
      '<p class="view-sub">내 증거와 공유 사실의 시각을 한 줄로 늘어놓습니다. 시계마다 기준이 다를 수 있습니다.</p>' +
      '<div class="tl-controls">' +
      '<label class="switch"><input type="checkbox" data-act="tl-corr"' + (corr ? ' checked' : '') + (off === null ? ' disabled' : '') + '><span>CCTV 보정 적용' + (off === null ? ' <small>(영상 시각 보정 후 사용 가능)</small>' : ' <small>(녹화기 표시 −7분)</small>') + '</span></label>' +
      '<div class="filters" role="group" aria-label="구간">' + [['all', '전체'], ['key', '21:38~21:58'], ['shared', '공유 사실만']].map(function (x) {
        return '<button class="chip-btn' + (f === x[0] ? ' on' : '') + '" aria-pressed="' + (f === x[0]) + '" data-act="tl-filter" data-id="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div></div>' + ruler +
      '<div class="tl-legend"><span class="k std">표준시</span><span class="k dvr">CCTV 표시 (보정 전)</span><span class="k corr">CCTV 보정</span><span class="k shared">공유 사실</span></div>' +
      (items.length ? '<ol class="timeline">' + items.map(function (it) {
        var src = it.ev ? '<button class="tl-src" data-act="open-ev" data-id="' + it.ev + '">' + e(evd(it.ev).title) + '</button>' : '<span class="tl-src">공동 확인</span>';
        return '<li class="tl ' + it.clock + '"><span class="tl-time">' + e(it.t) + (it.raw && it.clock === 'corr' ? '<small>표시 ' + e(it.raw) + '</small>' : '') + '</span><span class="tl-body"><span class="tl-label">' + e(it.label) + '</span>' + src + '</span></li>';
      }).join('') + '</ol>' : '<p class="muted">아직 시각이 있는 자료가 없습니다.</p>');
  }
  function rulerSvg(items) {
    var a = U.toSec('21:39:00'), b = U.toSec('21:57:00');
    var W = 1000, H = 90;
    var x = function (s) { return ((s - a) / (b - a)) * (W - 40) + 20; };
    var ticks = '';
    for (var s = a; s <= b; s += 60) {
      var big = (s / 60) % 5 === 0;
      ticks += '<line x1="' + x(s) + '" x2="' + x(s) + '" y1="' + (big ? 54 : 60) + '" y2="68" stroke="#56646d"/>' + (big ? '<text x="' + x(s) + '" y="84" text-anchor="middle" font-size="13" fill="#9aa3a8" font-family="monospace">' + U.fmt(s, false) + '</text>' : '');
    }
    var dots = items.filter(function (i) { return i.sec >= a && i.sec <= b; }).map(function (i, k) {
      var col = { std: '#e8a63a', dvr: '#7d8a92', corr: '#5fbf7f', shared: '#e9e3d6' }[i.clock] || '#e8a63a';
      var lane = { shared: 10, std: 24, corr: 38, dvr: 38 }[i.clock] || 24;
      return '<circle cx="' + x(i.sec) + '" cy="' + lane + '" r="5" fill="' + col + '"><title>' + e(i.t + ' ' + i.label) + '</title></circle>';
    }).join('');
    return '<div class="ruler"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="21:39부터 21:57까지 사건 점 분포. 자세한 내용은 아래 목록.">' +
      '<rect x="' + x(U.toSec('21:45:00')) + '" y="0" width="' + (x(U.toSec('21:50:00')) - x(U.toSec('21:45:00'))) + '" height="70" fill="#d65a43" opacity=".09"/>' +
      '<text x="' + x(U.toSec('21:47:30')) + '" y="52" text-anchor="middle" font-size="11" fill="#d65a43" opacity=".9">마지막 인사 송출 21:45~21:50</text>' +
      '<line x1="20" x2="' + (W - 20) + '" y1="60" y2="60" stroke="#3a4750"/>' + ticks + dots + '</svg></div>';
  }

  /* 노트 */
  function viewNotes() {
    var r = R();
    return '<h2 class="view-title" tabindex="-1">' + e(roleName(S.role)) + '의 수사 노트</h2>' +
      '<p class="view-sub">이 노트는 ' + e(roleName(S.role)) + ' 역할에만 저장됩니다. 상대에게 전할 것, 상대에게 들은 것을 적어 두세요.</p>' +
      '<label class="sr-only" for="notes">수사 노트</label>' +
      '<textarea id="notes" class="notes" maxlength="20000" placeholder="예) 이안: 복도 조명 OFF 21:47:05 / 나: CCTV 표시 21:54:05">' + e(r.notes) + '</textarea>' +
      '<p class="muted small" id="noteState" role="status">자동 저장</p>';
  }

  /* 사건 보드 */
  function viewBoard() {
    var n = E.act(S);
    var html = '<h2 class="view-title" tabindex="-1">사건 보드</h2><p class="view-sub">공동 분석과 공동 결론은 두 사람이 함께 씁니다. 가설 보드는 ' + e(roleName(S.role)) + '만 봅니다.</p>';
    html += '<section class="board-sec"><h3>공동 분석</h3><ul class="joints">' + Object.keys(C.joints).filter(function (id) { return C.joints[id].act <= n; }).map(function (id) {
      var j = C.joints[id], done = E.jointDone(S, id), avail = E.jointAvailable(S, id), mine = j.by === S.role;
      var status = done ? '완료' : !avail ? '대기' : mine ? '내 화면에서 진행' : roleName(j.by) + ' 화면에서 진행';
      var body = done ? '<p class="fact">' + e(C.facts[j.fact].text) + '</p>'
        : (mine ? '<p>' + e(j.intro) + '</p>' + (avail ? '<button class="btn small primary" data-act="joint" data-id="' + id + '">진행하기</button>' : '<p class="muted">' + (j.requires ? '앞 단계를 먼저 끝내세요.' : '') + '</p>')
          : '<p>' + e((j.partner && j.partner[S.role]) || j.intro) + '</p>');
      if (!done && !mine && id === 'MATCH') body = '<p>이안이 음원 작업대에서 두 파형을 겹쳐 봅니다.</p>';
      return '<li class="joint ' + (done ? 'done' : avail ? 'open' : 'wait') + '"><div class="jh"><span class="jt">' + e(j.title) + '</span><span class="js">' + e(status) + '</span></div><p class="jw">' + e(j.where) + '</p>' + body + '</li>';
    }).join('') + '</ul></section>';
    html += '<section class="board-sec"><h3>공동 결론</h3>' + ['IC1', 'IC2', 'FINAL'].filter(function (id) { return C.conclusions[id].act <= n; }).map(conclusionBlock).join('') + '</section>';
    var facts = E.factsUnlocked(S);
    html += '<section class="board-sec"><h3>공유 사실</h3>' + (facts.length ? '<ol class="facts">' + facts.map(function (f) { return '<li>' + e(C.facts[f].text) + '</li>'; }).join('') + '</ol>' : '<p class="muted">공동 분석을 통과하면 여기에 쌓입니다.</p>') + '</section>';
    html += suspectBoard();
    return html;
  }
  function conclusionBlock(id) {
    var c = C.conclusions[id], rec = S.shared.concl[id] || {}, done = E.conclDone(S, id), avail = E.conclAvailable(S, id);
    var head = '<div class="ch"><h4>' + e(c.title) + '</h4><span class="cs">' + (done ? '확정' : avail ? '제출 가능' : '잠김') + (rec.tries ? ' · 제출 ' + rec.tries + '회' : '') + '</span></div>';
    if (done) return '<div class="concl done">' + head + summarizeConclusion(id) + '</div>';
    if (!avail) return '<div class="concl locked">' + head + '<p class="muted">' + e(c.lockedText) + '</p></div>';
    if (id === 'FINAL') return '<div class="concl open">' + head + finalForm() + '</div>';
    var draft = ui.drafts[id] || (rec.last ? U.clone(rec.last) : {});
    ui.drafts[id] = draft;
    var last = ui.lastResults && ui.lastResults[id];
    var form = '<form class="ic-form" data-form="concl" data-id="' + id + '">' + c.fields.map(function (f) {
      var res = last && last.filter(function (r) { return r.field === f.id; })[0];
      var fb = res ? '<p class="fb ' + (res.ok ? 'ok' : 'bad') + '">' + (res.ok ? '✓ 기록과 맞습니다' : '✗ ' + e(res.msg)) + '</p>' : '';
      if (f.multi) {
        var vals = Array.isArray(draft[f.id]) ? draft[f.id] : [];
        return '<fieldset class="field"><legend>' + e(f.label) + '</legend><div class="checks">' + f.options.map(function (o) {
          return '<label class="check"><input type="checkbox" name="' + f.id + '" value="' + o[0] + '"' + (vals.indexOf(o[0]) >= 0 ? ' checked' : '') + '><span>' + e(o[1]) + '</span></label>';
        }).join('') + '</div>' + fb + '</fieldset>';
      }
      return '<label class="field">' + e(f.label) + '<select name="' + f.id + '"><option value="">선택하세요</option>' + f.options.map(function (o) {
        return '<option value="' + o[0] + '"' + (draft[f.id] === o[0] ? ' selected' : '') + '>' + e(o[1]) + '</option>';
      }).join('') + '</select>' + fb + '</label>';
    }).join('') + '<button class="btn primary">결론 제출</button><p class="muted small">틀려도 진행에는 문제가 없습니다. 제출 횟수는 엔딩의 수사 기록에 남습니다.</p></form>';
    return '<div class="concl open">' + head + form + '</div>';
  }
  function summarizeConclusion(id) {
    var c = C.conclusions[id];
    if (id === 'FINAL') return '<p class="fact">보고서가 받아들여졌다.</p><button class="btn small" data-act="to-ending">사건 정리 보기</button>';
    return '<ul class="concl-sum">' + c.fields.map(function (f) {
      var ans = c.answer[f.id];
      var label = Array.isArray(ans) ? f.options.filter(function (o) { return ans.indexOf(o[0]) >= 0 && (f.multi !== 2 || (S.shared.concl[id].last && (S.shared.concl[id].last[f.id] || []).indexOf(o[0]) >= 0)); }).map(function (o) { return o[1]; }).join(' · ')
        : f.options.filter(function (o) { return o[0] === ans; })[0][1];
      return '<li><span>' + e(f.label) + '</span><strong>' + e(label) + '</strong></li>';
    }).join('') + '</ul>';
  }
  function allFoundEvidence() {
    var list = [];
    E.ROLES.forEach(function (r) { Object.keys(S.roles[r].found).forEach(function (id) { list.push(id); }); });
    return list;
  }
  function finalForm() {
    var c = C.conclusions.FINAL;
    var draft = ui.finalDraft || (S.shared.concl.FINAL && S.shared.concl.FINAL.last ? U.clone(S.shared.concl.FINAL.last) : {});
    ui.finalDraft = draft;
    var last = ui.lastResults && ui.lastResults.FINAL;
    var evs = allFoundEvidence();
    var evOptions = function (sel) {
      var groups = { seoha: [], ian: [] };
      evs.forEach(function (id) { groups[evd(id).owner].push(id); });
      return '<option value="">근거 증거 선택</option>' + E.ROLES.map(function (r) {
        return '<optgroup label="' + e(roleName(r)) + '의 증거' + (r !== S.role ? ' (제목만)' : '') + '">' + groups[r].map(function (id) {
          return '<option value="' + id + '"' + (sel === id ? ' selected' : '') + '>' + e(evd(id).title) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    };
    var html = '<form class="final-form" data-form="final"><p class="muted">빈칸을 채워 사건의 인과를 한 문장씩 잇습니다. 근거 칸에는 두 사람이 확보한 증거 중 하나를 고르세요.</p><ol class="sentences">' +
      c.sentences.map(function (s) {
        var d = draft[s.id] || (draft[s.id] = {});
        var res = last && last.filter(function (r) { return r.sentence === s.id; })[0];
        var parts = s.text.split(/(\{[a-zA-Z]+\})/);
        var body = parts.map(function (pt) {
          var m = pt.match(/^\{([a-zA-Z]+)\}$/);
          if (!m) return e(pt);
          var f = s.fields.filter(function (x) { return x.id === m[1]; })[0];
          var name = s.id + '.' + f.id;
          if (f.evidence) return '<select class="blank ev" name="' + name + '" aria-label="근거 증거">' + evOptions(d[f.id]) + '</select>';
          return '<select class="blank" name="' + name + '" aria-label="빈칸"><option value="">　…　</option>' + f.options.map(function (o) {
            return '<option value="' + o[0] + '"' + (d[f.id] === o[0] ? ' selected' : '') + '>' + e(o[1]) + '</option>';
          }).join('') + '</select>';
        }).join('');
        return '<li class="sentence' + (res ? (res.ok ? ' ok' : ' bad') : '') + '"><span class="cat">' + e(s.cat) + '</span><p>' + body + '</p>' +
          (res ? '<p class="fb ' + (res.ok ? 'ok' : 'bad') + '">' + (res.ok ? '✓ 기록과 맞습니다' : '✗ ' + e(res.msg)) + '</p>' : '') + '</li>';
      }).join('') + '</ol><button class="btn primary">보고서 제출</button><p class="muted small">틀린 문장에는 어떤 종류의 기록과 충돌하는지 표시됩니다.</p></form>';
    return html;
  }
  function suspectBoard() {
    var r = R(), sv = E.sharedVerdicts(S);
    var STATUS = [['suspect', '의심'], ['open', '보류'], ['cleared', '배제']];
    return '<section class="board-sec"><h3>가설 보드 <small>(' + e(roleName(S.role)) + '만 보기)</small></h3><ul class="suspects">' + E.SUSPECTS.map(function (w) {
      var su = r.suspects[w], p = person(w);
      var stamp = sv[w] === 'cleared' ? '<span class="stamp cleared">공동 결론: 배제</span>' : sv[w] === 'culprit' ? '<span class="stamp culprit">공동 결론: 범인</span>' : '';
      var links = su.links.filter(function (l) { return r.found[l.ev]; });
      return '<li class="suspect s-' + su.status + '">' + A.portrait(w, 56) + '<div class="su-body"><div class="su-head"><strong>' + e(p.name) + '</strong> <small>' + e(p.role) + '</small>' + stamp + '</div>' +
        '<div class="seg" role="radiogroup" aria-label="' + e(p.name) + ' 가설 상태">' + STATUS.map(function (s) {
          return '<button role="radio" aria-checked="' + (su.status === s[0]) + '" class="' + (su.status === s[0] ? 'on ' + s[0] : '') + '" data-act="suspect" data-who="' + w + '" data-id="' + s[0] + '">' + s[1] + '</button>';
        }).join('') + '</div>' +
        (links.length ? '<ul class="links">' + links.map(function (l) { return '<li class="' + l.stance + '"><span>' + (l.stance === 'for' ? '의심 근거' : '배제 근거') + '</span><button class="chip-btn" data-act="open-ev" data-id="' + l.ev + '">' + e(evd(l.ev).title) + '</button></li>'; }).join('') + '</ul>' : '<p class="muted small">증거를 열고 [가설에 연결]로 근거를 붙일 수 있습니다.</p>') +
        '<label class="field small">메모<input data-memo="' + w + '" maxlength="600" value="' + e(su.memo) + '" placeholder="이 사람에 대한 생각"></label></div></li>';
    }).join('') + '</ul>' +
      (r.suspectLog.length ? '<details class="log-hist"><summary>가설 변경 기록 ' + r.suspectLog.length + '건</summary><ol>' + r.suspectLog.slice().reverse().map(function (l) {
        var lab = { open: '보류', suspect: '의심', cleared: '배제' };
        return '<li>' + l.act + '막 · ' + e(person(l.who).name) + ': ' + lab[l.from] + ' → ' + lab[l.to] + '</li>';
      }).join('') + '</ol></details>' : '') + '</section>';
  }

  /* ───────── 증거 본문 ───────── */
  function renderEvidenceBody(id) {
    var ev = evd(id);
    switch (ev.type) {
      case 'photo': return '<figure class="photo"><div class="ev-art zoomable">' + A.scene(ev.photo.art) + '</div><figcaption><span class="exif">촬영 ' + e(ev.photo.exif) + ' · 서하 휴대전화 (표준시)</span>' + e(ev.photo.caption) + '</figcaption></figure>';
      case 'paper': return renderPaper(ev.doc);
      case 'log': return '<div class="term">' + renderLog(ev) + '</div>';
      case 'object': return '<div class="object"><div class="ev-art zoomable">' + A.object(ev.obj.art, ev.obj) + '</div><ul class="facts-list">' + ev.obj.facts.map(function (f) { return '<li>' + e(f) + '</li>'; }).join('') + '</ul></div>';
      case 'testimony': return renderTestimony(ev);
      case 'audio': return '<div class="ev-audio">' + waveSvg(ev.rec, { compact: true }) + '<p>' + e(C.recordings[ev.rec].label) + ' · ' + U.mmss(C.recordings[ev.rec].dur) + '</p><p class="muted">표시: ' + e(markerSummary(ev.rec)) + '</p><button class="btn small" data-act="goto-audio" data-id="' + ev.rec + '">음원 작업대에서 열기</button></div>';
      case 'graph': return renderLoggers(false);
      case 'cctv': return renderCctvViewer();
      case 'phone': return '<div class="phone"><div class="phone-head">' + e(ev.phone.owner) + '의 휴대전화 · 최근 통화</div><ul>' + ev.phone.rows.map(function (r) {
        return '<li><span class="dir ' + (r[0] === '발신' ? 'out' : 'in') + '">' + e(r[0]) + '</span><span class="num">' + e(r[1]) + '</span><span class="tm">' + e(r[2]) + '</span><span class="du">' + e(r[3]) + '</span></li>';
      }).join('') + '</ul></div>';
    }
    return '';
  }
  function renderPaper(d) {
    return '<div class="paper ' + e(d.style) + '">' + (d.head ? '<h4>' + e(d.head) + '</h4>' : '') +
      '<ul class="pl">' + d.lines.map(function (l) { return '<li>' + e(l) + '</li>'; }).join('') + '</ul>' +
      (d.hand ? '<div class="hand">' + d.hand.map(function (h) { return '<span>' + e(h) + '</span>'; }).join('') + '</div>' : '') +
      (d.stamp ? '<span class="stamp-mark">' + e(d.stamp) + '</span>' : '') +
      (d.foot ? '<p class="foot">' + e(d.foot) + '</p>' : '') + '</div>';
  }
  function renderLog(ev) {
    if (ev.id === 'i_registry') {
      var hits = S.roles.ian.registryHits.map(function (no) { return C.registry.filter(function (r) { return r.no === no; })[0]; });
      return '<p class="term-head">자료 대장 · 검색한 항목</p>' + (hits.length ? registryTable(hits) : '<p>검색한 항목이 없습니다.</p>');
    }
    var L = ev.log;
    return '<p class="term-head">' + e(L.system) + '</p><div class="table-wrap"><table class="log"><thead><tr>' + L.cols.map(function (c) { return '<th scope="col">' + e(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      L.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th scope="row">' + e(c) + '</th>' : '<td>' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>' + (L.note ? '<p class="term-note">' + e(L.note) + '</p>' : '');
  }
  function renderTestimony(ev) {
    var q = ev.quote, p = person(q.who), t = E.TOPIC[ev.topic];
    return '<div class="testimony">' + A.portrait(q.who, 72) + '<div><p class="q">서하: ' + e(t.q) + '</p>' + q.lines.map(function (l) { return '<blockquote>' + e(l) + '</blockquote>'; }).join('') +
      '<p class="by">— ' + e(p.name) + ' (' + e(p.role) + ')</p>' + (q.note ? '<p class="obs">' + e(q.note) + '</p>' : '') + '</div></div>';
  }
  function loggerSeries(lg) {
    var w0 = U.toSec(C.loggers.window[0]), w1 = U.toSec(C.loggers.window[1]);
    var pts = [];
    for (var s = w0; s <= w1; s += 60) {
      var t = lg.base.t, h = lg.base.h;
      if (lg.drop) {
        var d0 = U.toSec(lg.drop.at);
        if (s >= d0) t = lg.drop.to + (lg.base.t - lg.drop.to) * Math.exp(-(s - d0) / (lg.drop.mins * 60 / 3));
      }
      lg.events.forEach(function (ev) {
        var a = U.toSec(ev.at);
        if (s + 59 >= a) {
          var dt = Math.max(0, s - a) / 60;
          var k = Math.exp(-dt / ev.decay);
          h += ev.h * k; t += ev.t * k;
        }
      });
      pts.push({ s: s, t: t, h: h });
    }
    return pts;
  }
  function loggerLoc(id) {
    if (id === 'HL-14') return '송출실 (이안 자리)';
    if (id === 'HL-22' && E.jointDone(S, 'J2')) return '금고 안 (서하 확인)';
    return '위치 미확인';
  }
  function renderLoggers(big) {
    var w0 = U.toSec(C.loggers.window[0]), w1 = U.toSec(C.loggers.window[1]);
    return '<ul class="loggers' + (big ? ' big' : '') + '">' + C.loggers.list.map(function (lg) {
      var pts = loggerSeries(lg), W = 320, H = 110;
      var x = function (s) { return ((s - w0) / (w1 - w0)) * (W - 20) + 10; };
      var tMin = 10, tMax = 26, hMin = 30, hMax = 60;
      var yT = function (v) { return H - 18 - ((v - tMin) / (tMax - tMin)) * (H - 30); };
      var yH = function (v) { return H - 18 - ((v - hMin) / (hMax - hMin)) * (H - 30); };
      var pT = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.s).toFixed(1) + ' ' + yT(p.t).toFixed(1); }).join('');
      var pH = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.s).toFixed(1) + ' ' + yH(p.h).toFixed(1); }).join('');
      var ticks = ['20:00', '21:00', '22:00'].map(function (t) { return '<line x1="' + x(U.toSec(t)) + '" x2="' + x(U.toSec(t)) + '" y1="6" y2="' + (H - 16) + '" stroke="#2a333b"/><text x="' + x(U.toSec(t)) + '" y="' + (H - 3) + '" text-anchor="middle" font-size="10" fill="#9aa3a8" font-family="monospace">' + t + '</text>'; }).join('');
      var evs = lg.events.filter(function (v) { return U.toSec(v.at) >= w0; });
      var evText = (lg.drop ? '온도 ' + lg.drop.at + '부터 ' + lg.base.t + '°→' + lg.drop.to + '°로 하강. ' : '') +
        (evs.length ? '습도 급상승: ' + evs.map(function (v) { return v.at + ' (+' + v.h.toFixed(1) + '%)'; }).join(', ') : (lg.drop ? '' : '큰 변화 없음'));
      return '<li class="logger"><div class="lg-head"><strong>' + e(lg.id) + '</strong><span>' + e(loggerLoc(lg.id)) + '</span></div>' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + e(lg.id + ' 그래프. ' + evText) + '"><rect width="' + W + '" height="' + H + '" fill="#0c1216"/>' + ticks +
        '<path d="' + pH + '" stroke="#6fb6c6" stroke-width="2" fill="none"/><path d="' + pT + '" stroke="#e8a63a" stroke-width="2" fill="none" stroke-dasharray="5 3"/></svg>' +
        '<p class="lg-key"><span class="h">— 습도</span><span class="t">- - 온도</span></p><p class="lg-ev">' + e(evText) + '</p></li>';
    }).join('') + '</ul>';
  }
  function renderCctvViewer() {
    var off = E.cctvOffset(S), k = C.cctv[ui.cctvIdx];
    var corr = off !== null && ui.cctvCorr;
    var std = corr ? U.fmt(U.toSec(k.t) - off) : null;
    return '<div class="cctv-viewer"><div class="ev-art zoomable">' + A.cctv(k) + '</div>' +
      '<div class="cctv-info" aria-live="polite"><p class="cctv-time"><span>녹화기 표시 <strong>' + e(k.t) + '</strong></span>' + (std ? '<span class="corr">보정 표준시 <strong>' + e(std) + '</strong></span>' : '') + '</p><p>' + e(k.text) + '</p></div>' +
      '<div class="cctv-nav"><button class="btn small" data-act="cctv-step" data-d="-1"' + (ui.cctvIdx === 0 ? ' disabled' : '') + '>◀ 이전 장면</button>' +
      '<span>' + (ui.cctvIdx + 1) + ' / ' + C.cctv.length + '</span>' +
      '<button class="btn small" data-act="cctv-step" data-d="1"' + (ui.cctvIdx === C.cctv.length - 1 ? ' disabled' : '') + '>다음 장면 ▶</button></div>' +
      (off !== null ? '<label class="switch"><input type="checkbox" data-act="cctv-corr"' + (corr ? ' checked' : '') + '><span>보정 시각 함께 보기 (공동 분석 결과)</span></label>' : '<p class="muted small">' + e(C.cctvNote) + '</p>') +
      '<ol class="cctv-list">' + C.cctv.map(function (kk, i) {
        return '<li><button class="' + (i === ui.cctvIdx ? 'on' : '') + '" data-act="cctv-go" data-i="' + i + '" aria-current="' + (i === ui.cctvIdx) + '">' + e(kk.t) + (corr ? ' → ' + e(U.fmt(U.toSec(kk.t) - off)) : '') + (kk.light ? '' : ' · 적외선') + '</button></li>';
      }).join('') + '</ol></div>';
  }

  /* ───────── 모달 ───────── */
  function focusSel(el) {
    if (!el || !el.dataset || !el.dataset.act) return null;
    var sel = '[data-act="' + el.dataset.act + '"]';
    if (el.dataset.id) sel += '[data-id="' + el.dataset.id + '"]';
    return sel;
  }
  function openModal(html, opt) {
    opt = opt || {};
    if (!modal.open) { ui.lastFocus = document.activeElement; ui.lastFocusSel = focusSel(document.activeElement); }
    modal.className = 'modal ' + (opt.cls || '');
    modal.innerHTML = html;
    ui.modal = opt.kind || 'info';
    if (!modal.open) {
      try { modal.showModal(); } catch (x) { modal.setAttribute('open', ''); }
      if (opt.push !== false) pushHist('modal');
    }
    var f = modal.querySelector('[data-autofocus]') || modal.querySelector('.modal-close');
    if (f) f.focus();
  }
  function closeModal(fromPop) {
    if (!modal.open && !modal.hasAttribute('open')) return;
    stopPlayer();
    try { modal.close(); } catch (x) { modal.removeAttribute('open'); }
    modal.innerHTML = '';
    ui.modal = null;
    if (!fromPop && ui.modalPushed) { ui.ignorePop++; try { history.back(); } catch (x) { ui.ignorePop--; } }
    ui.modalPushed = false;
    if (ui.dirty) { ui.dirty = false; render({ keepScroll: true }); }
    if (ui.lastFocus && document.body.contains(ui.lastFocus)) ui.lastFocus.focus();
    else if (ui.lastFocusSel) { var f = app.querySelector(ui.lastFocusSel); if (f) f.focus(); }
  }
  function modalFrame(title, body, foot, sub) {
    return '<div class="modal-inner"><header class="modal-head"><div><h2 id="modalTitle">' + title + '</h2>' + (sub ? '<p class="modal-sub">' + sub + '</p>' : '') + '</div>' +
      '<button class="btn small icon modal-close" data-act="close-modal" aria-label="닫기">✕</button></header><div class="modal-body">' + body + '</div>' + (foot ? '<footer class="modal-foot">' + foot + '</footer>' : '') + '</div>';
  }
  function openInfo(title, body) { openModal(modalFrame(e(title), body, '<button class="btn primary" data-act="close-modal" data-autofocus>확인</button>'), { kind: 'info' }); }
  function openEvidence(id, line, extras) {
    var ev = evd(id);
    if (!ev || !E.hasFound(S, id) || ev.owner !== S.role && S.phase !== 'ending') return;
    E.markRead(S, ev.owner, id);
    persist();
    ui.dirty = true;
    ui.openEv = id;
    var tabs = (extras && extras.length > 1) ? '<div class="ev-tabs" role="tablist">' + extras.map(function (x) {
      return '<button role="tab" aria-selected="' + (x === id) + '" class="' + (x === id ? 'on' : '') + '" data-act="ev-tab" data-id="' + x + '" data-set="' + extras.join(',') + '">' + e(evd(x).title) + '</button>';
    }).join('') + '</div>' : '';
    var linkUi = '<details class="link-ui"><summary>가설에 연결</summary><div class="link-grid">' + E.SUSPECTS.map(function (w) {
      var cur = R().suspects[w].links.filter(function (l) { return l.ev === id; })[0];
      var st = cur ? cur.stance : '';
      return '<div class="link-row"><span>' + e(person(w).name) + '</span>' + [['for', '의심 근거'], ['against', '배제 근거'], ['', '없음']].map(function (o) {
        return '<button class="chip-btn' + (st === o[0] ? ' on' : '') + '" aria-pressed="' + (st === o[0]) + '" data-act="link" data-who="' + w + '" data-id="' + id + '" data-stance="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }).join('') + '</div></details>';
    var body = (line ? '<p class="monologue">' + e(line) + '</p>' : '') + tabs + '<div class="ev-body t-' + ev.type + '">' + renderEvidenceBody(id) + '</div>';
    var foot = linkUi + '<div class="foot-actions">' + (ev.type !== 'graph' && ev.type !== 'cctv' && ev.type !== 'log' ? '' : '') +
      '<button class="btn small" data-act="zoom">확대</button><button class="btn small" data-act="quote" data-id="' + id + '">노트에 인용</button>' +
      '<button class="btn small primary" data-act="close-modal">닫기</button></div>' +
      '<p class="muted small">' + (S.mode === 'solo' ? '검수 모드' : '이 자료는 ' + e(roleName(other(ev.owner))) + '의 화면에 없습니다. 필요한 부분은 말로 설명하세요.') + '</p>';
    var sub = '<span class="type-badge t-' + ev.type + '">' + TYPE_ICON[ev.type] + ' ' + TYPE_LABEL[ev.type] + '</span>' + ((ev.times || [])[0] ? ' · ' + e(ev.times[0].t) : '');
    openModal(modalFrame(e(ev.title), body, foot, sub), { kind: 'evidence', cls: 'wide', push: !modal.open });
  }
  function openCctv() {
    openEvidence('s_cctv', null);
  }

  /* 공동 분석 모달 */
  function openJoint(id) {
    var j = C.joints[id];
    if (!j || j.by !== S.role) return;
    if (id === 'J5') { openShelf(); return; }
    if (id === 'MATCH') { go('audio'); return; }
    var done = E.jointDone(S, id);
    var rec = S.shared.joints[id] || {};
    var body = '<p>' + e(j.intro) + '</p>';
    if (done) body += '<p class="ok-line">✓ ' + e(C.facts[j.fact].text) + '</p>';
    else {
      body += '<form data-form="joint" data-id="' + id + '" class="joint-form">';
      if (id === 'J1') {
        body += '<fieldset class="field"><legend>건물 기록의 사건</legend><div class="radios">' + j.pairs.map(function (p, i) {
          return '<label class="radio"><input type="radio" name="pair" value="' + p.id + '"' + (i === 0 ? ' data-autofocus' : '') + '><span>' + e(p.label) + '</span></label>';
        }).join('') + '</div></fieldset>' +
          '<label class="field">같은 순간의 CCTV 녹화기 표시 시각<input name="dvr" inputmode="numeric" autocomplete="off" placeholder="예: 21:00:00" maxlength="8"></label>';
      } else if (id === 'J2') {
        body += '<fieldset class="field"><legend>금고 안 기록계</legend><div class="radios row">' + C.loggers.list.map(function (lg, i) {
          return '<label class="radio"><input type="radio" name="logger" value="' + lg.id + '"' + (i === 0 ? ' data-autofocus' : '') + '><span>' + e(lg.id) + '</span></label>';
        }).join('') + '</div></fieldset>';
      } else {
        body += j.fields.map(function (f, i) {
          if (f.type === 'text') return '<label class="field">' + e(f.label) + '<input name="' + f.id + '" autocomplete="off" maxlength="20" placeholder="' + e(f.placeholder || '') + '"></label>';
          return '<label class="field">' + e(f.label) + '<select name="' + f.id + '"' + (i === 0 ? ' data-autofocus' : '') + '><option value="">선택하세요</option>' + f.options.map(function (o) {
            return '<option value="' + o[0] + '">' + e(o[1]) + '</option>';
          }).join('') + '</select></label>';
        }).join('');
      }
      body += '<div id="jointMsg" class="fb" role="alert"></div><button class="btn primary">분석 확인</button>' + (rec.tries ? '<p class="muted small">시도 ' + rec.tries + '회</p>' : '') + '</form>';
      body += '<p class="muted small">이 분석에는 ' + e(U.josa(roleName(other(j.by)), '이/가')) + ' 가진 정보가 필요합니다. 화면을 넘겨 물어보거나, 말로 받아 적은 내용을 입력하세요.</p>';
    }
    openModal(modalFrame('공동 분석 · ' + e(j.title), body, '<button class="btn" data-act="close-modal">닫기</button>', e(j.where)), { kind: 'joint' });
  }
  function submitJointForm(form) {
    var id = form.dataset.id, fd = new FormData(form), input = {};
    fd.forEach(function (v, k) { input[k] = v; });
    var res = E.submitJoint(S, id, input);
    persist();
    var msg = $('#jointMsg', form);
    if (res.ok) {
      sfx('success');
      announce('공동 분석 완료');
      var fact = res.fact ? C.facts[res.fact].text : '';
      ui.dirty = true;
      modal.querySelector('.modal-body').innerHTML = '<p class="ok-line big">✓ 분석 완료</p><p class="fact">' + e(fact) + '</p><p class="muted">사건 보드의 공유 사실에 올라갔습니다.</p>';
      var c = modal.querySelector('.modal-foot .btn'); if (c) { c.textContent = '확인'; c.focus(); }
    } else {
      sfx('error');
      msg.innerHTML = res.msgs.map(function (m) { return '<p>✗ ' + e(m) + '</p>'; }).join('');
    }
  }

  /* 지하 선반 C */
  function openShelf() {
    var opened = S.shared.opened, weighed = R().weighed;
    var body = '<p>' + e(C.joints.J5.intro) + '</p><ul class="shelf">' + C.boxes.map(function (b) {
      var isOpen = opened.indexOf(b.id) >= 0, isW = weighed.indexOf(b.id) >= 0;
      return '<li class="box' + (isOpen ? ' opened' : '') + (isOpen && b.target ? ' target' : '') + '"><div class="box-face"><span class="box-id">' + e(b.id) + '</span><span class="seal">봉인 ' + e(b.seal) + '</span></div>' +
        '<p class="box-w">' + (isW ? '무게 <strong>' + b.weight.toFixed(1) + 'kg</strong>' : '무게 미측정') + '</p>' +
        (isOpen ? '<p class="box-c">' + e(b.contents) + '</p>' : '') +
        '<div class="box-act">' + (isW ? '' : '<button class="btn small" data-act="weigh" data-id="' + b.id + '">계량대에 올리기</button>') +
        (isOpen ? '' : '<button class="btn small warn" data-act="open-box" data-id="' + b.id + '">봉인 뜯기</button>') + '</div></li>';
    }).join('') + '</ul><div id="shelfMsg" class="fb" role="status"></div>' +
      (E.jointDone(S, 'J5') ? '<p class="ok-line">✓ ' + e(C.facts.F_box.text) + ' <button class="chip-btn" data-act="open-ev" data-id="s_reel">' + e(evd('s_reel').title) + '</button></p>' : '<p class="muted small">상자 겉에는 “청솔자원 · 폐기”만 적혀 있습니다. 원래 무엇이 들었는지는 이안의 업체 목록에 있습니다.</p>');
    var html = modalFrame('선반 C · 빨간 운송 상자', body, '<button class="btn" data-act="close-modal">닫기</button>', '지하 반출대기실');
    if (modal.open) { modal.innerHTML = html; } else openModal(html, { kind: 'shelf', cls: 'wide' });
  }
  function openBox(id) {
    confirmBox('봉인을 뜯을까요?', id + ' 상자의 업체 봉인을 뜯습니다. 감사 대상 물품이라 되돌릴 수 없고, 보고서에 기록됩니다.', '봉인 뜯기', function () {
      var res = E.submitJoint(S, 'J5', { box: id });
      persist();
      ui.dirty = true;
      if (res.ok) { sfx('success'); announce('원본으로 보이는 릴을 찾았다'); }
      else sfx('paper');
      openShelf();
      var m = $('#shelfMsg'); if (m) m.textContent = res.ok ? id + ' 안에 테이프가 감긴 10.5인치 금속 릴이 있다. 증거함에 넣었다.' : res.msgs[0];
    });
  }
  function confirmBox(title, text, okLabel, onOk) {
    var dlg = $('#confirm');
    dlg.innerHTML = '<div class="modal-inner small"><h2 id="confirmTitle">' + e(title) + '</h2><p>' + e(text) + '</p><div class="foot-actions"><button class="btn" data-confirm="no">취소</button><button class="btn primary warn" data-confirm="yes">' + e(okLabel) + '</button></div></div>';
    var prev = document.activeElement;
    try { dlg.showModal(); } catch (x) { dlg.setAttribute('open', ''); }
    dlg.querySelector('[data-confirm="no"]').focus();
    dlg.onclick = function (ev) {
      var b = ev.target.closest('[data-confirm]'); if (!b) return;
      try { dlg.close(); } catch (x) { dlg.removeAttribute('open'); }
      if (b.dataset.confirm === 'yes') onOk(); else if (prev) prev.focus();
    };
  }

  /* 힌트 */
  function openHint(key) {
    var hs = C.hints[key]; if (!hs) return;
    var used = S.shared.hints[key] || 0;
    var names = ['관찰 방향', '조합 방향', '구체적 도움'];
    var body = '<ol class="hints">' + hs.map(function (h, i) {
      if (i < used) return '<li class="shown"><span class="hn">' + names[i] + '</span><p>' + e(h) + '</p></li>';
      if (i === used) return '<li class="next"><span class="hn">' + names[i] + '</span><button class="btn small' + (i === 2 ? ' warn' : '') + '" data-act="hint-more" data-id="' + key + '" data-autofocus>' + names[i] + ' 보기' + (i === 2 ? ' (결정적인 정보 포함)' : '') + '</button></li>';
      return '<li class="later"><span class="hn">' + names[i] + '</span><p class="muted">앞 단계를 먼저 보세요.</p></li>';
    }).join('') + '</ol><p class="muted small">힌트는 두 역할이 함께 씁니다. 사용 횟수는 엔딩 기록에만 남고 진행에는 영향이 없습니다.</p>';
    var obj = [].concat(C.objectives[1], C.objectives[2], C.objectives[3]).filter(function (o) { return o.id === key; })[0];
    var html = modalFrame('힌트', body, '<button class="btn" data-act="close-modal">닫기</button>', obj ? e(obj.label) : '');
    if (modal.open && ui.modal === 'hint') { modal.innerHTML = html; var f = modal.querySelector('[data-autofocus]') || modal.querySelector('.hints .shown:last-of-type p'); if (f) { if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1'); f.focus(); } }
    else openModal(html, { kind: 'hint' });
  }

  /* 설정·메뉴 */
  function openSettings() {
    var body = '<div class="settings">' +
      '<label class="switch"><input type="checkbox" data-setting="sound"' + (ST.sound ? ' checked' : '') + '><span>효과음</span></label>' +
      '<label class="field">볼륨 <input type="range" min="0" max="1" step="0.05" value="' + ST.volume + '" data-setting="volume" aria-label="볼륨"' + (ST.sound ? '' : ' disabled') + '></label>' +
      '<label class="switch"><input type="checkbox" data-setting="ambience"' + (ST.ambience ? ' checked' : '') + (ST.sound ? '' : ' disabled') + '><span>송출실 환경음 (낮은 웅웅거림)</span></label>' +
      '<label class="switch"><input type="checkbox" data-setting="showTimer"' + (ST.showTimer ? ' checked' : '') + '><span>경과 시간 표시 <small>기록용 · 시간 제한 없음</small></span></label>' +
      '<p class="muted small">저장: ' + (store.available ? '이 기기 브라우저에 자동 저장' : '저장 불가 (창을 닫으면 사라짐)') + ' · 저장 형식 v' + E.SAVE_VERSION + '</p>' +
      '</div>';
    var foot = '<div class="foot-actions wrap">' +
      '<button class="btn" data-act="howto">플레이 방법</button>' +
      (ui.atTitle ? '' : '<button class="btn" data-act="to-title">타이틀로</button>') +
      (S.phase !== 'title' ? '<button class="btn warn" data-act="reset">처음부터 다시 (진행 삭제)</button>' : '') +
      '<button class="btn primary" data-act="close-modal">닫기</button></div>';
    var html = modalFrame('메뉴 · 설정', body, foot);
    if (modal.open && ui.modal === 'settings') modal.innerHTML = html; else openModal(html, { kind: 'settings' });
  }
  function openHowto() {
    var body = '<div class="howto">' +
      '<h3>목표</h3><p>자정 전에 사라진 원본 릴을 찾고, 누가 어떻게 가져갔는지 보고서로 증명합니다.</p>' +
      '<h3>두 역할</h3><ul><li><strong>서하 (현장)</strong> — 평면도에서 방을 골라 물건·문서를 조사하고, 사람들을 인터뷰합니다.</li><li><strong>이안 (송출실)</strong> — 건물 관리 기록, 센서 그래프, 송출 음원과 장비 로그를 분석합니다.</li></ul>' +
      '<h3>협동</h3><p>각자의 자료는 상대 화면에 나오지 않습니다. <strong>공동 분석</strong>은 한쪽 화면에서 진행하지만 다른 쪽이 가진 정보가 있어야 풀립니다. 서로 설명하고 다시 확인하세요.</p>' +
      '<h3>진행</h3><p>3막 구성입니다. 공동 결론을 내리면 새 자료가 열리고, 앞에서 본 자료의 의미가 달라집니다. 최종 보고서는 범인뿐 아니라 수법·시각·물증의 연결을 묻습니다.</p>' +
      '<h3>모드</h3><ul><li><strong>2인 협동 (한 기기)</strong> — 역할을 넘길 때 화면이 가려집니다. 받는 사람이 확인 버튼을 누르면 이어집니다.</li><li><strong>혼자 검수</strong> — 두 역할을 바로 오가며 전체 흐름을 확인합니다. 협동의 재미는 줄어듭니다.</li><li>두 기기를 이어 주는 원격 플레이는 지원하지 않습니다.</li></ul>' +
      '<h3>막혔을 때</h3><p>상단 [힌트]는 관찰 방향 → 조합 방향 → 구체적 도움 순서로 열립니다. 틀린 결론에는 어떤 종류의 기록과 충돌하는지 알려 줍니다.</p>' +
      '<h3>저장과 소리</h3><p>진행은 이 기기 브라우저에 자동 저장됩니다. 효과음은 선택 사항이며, 소리로 전달되는 정보는 모두 화면 글로도 확인할 수 있습니다.</p>' +
      '<h3>예상 시간</h3><p>' + e(C.estimate) + '</p></div>';
    openModal(modalFrame('플레이 방법', body, '<button class="btn primary" data-act="close-modal" data-autofocus>확인</button>'), { kind: 'howto', push: !modal.open });
  }
  function openModeSelect() {
    var body = '<div class="modes">' +
      '<button class="mode-card" data-act="mode" data-id="duo" data-autofocus><span class="mc-title">2인 협동 · 한 기기를 번갈아</span><span class="mc-tag">추천</span>' +
      '<span>한 사람은 서하, 한 사람은 이안. 역할을 넘길 때 화면이 가려지고, 자료는 말로 주고받습니다.</span></button>' +
      '<button class="mode-card" data-act="mode" data-id="solo"><span class="mc-title">혼자 검수 · 두 역할 오가기</span>' +
      '<span>한 사람이 두 역할의 자료를 모두 확인합니다. 흐름 점검이나 혼자 해 보기용입니다.</span></button>' +
      '</div><p class="muted small">원격으로 두 기기를 잇는 기능은 없습니다. 같은 자리에서 한 기기로 플레이하세요.</p>';
    openModal(modalFrame('어떻게 플레이할까요?', body, '<button class="btn" data-act="close-modal">취소</button>'), { kind: 'mode' });
  }

  /* 역할 넘기기 */
  function requestSwitch() {
    if (S.mode === 'solo') {
      E.switchRole(S); persist(); sfx('relay');
      render(); toast(roleName(S.role) + ' 화면입니다.');
      return;
    }
    var to = other(S.role);
    handoff.innerHTML = '<div class="handoff-inner ' + to + '">' + A.portrait(to, 96) +
      '<h2 id="handoffTitle">' + e(roleName(to)) + '에게 화면을 넘겨주세요</h2>' +
      '<p>' + e(roleName(S.role)) + '의 화면은 가려졌습니다. ' + e(U.josa(roleName(to), '이/가')) + ' 기기를 받은 뒤 아래 버튼을 누르세요.</p>' +
      '<p class="muted">넘기기 전에, 전할 내용을 말로 정리했나요? 상대의 자료는 그 사람 화면에서만 보입니다.</p>' +
      '<div class="foot-actions"><button class="btn" data-act="handoff-cancel">돌아가기</button><button class="btn primary big" data-act="handoff-go">' + e(roleName(to)) + '입니다 · 시작</button></div></div>';
    closeModal();
    app.setAttribute('aria-hidden', 'true');
    app.classList.add('hidden-behind');
    try { handoff.showModal(); } catch (x) { handoff.setAttribute('open', ''); }
    handoff.querySelector('[data-act="handoff-go"]').focus();
    sfx('handoff');
  }
  function finishHandoff(go) {
    try { handoff.close(); } catch (x) { handoff.removeAttribute('open'); }
    app.removeAttribute('aria-hidden');
    app.classList.remove('hidden-behind');
    if (go) { E.switchRole(S); persist(); sfx('relay'); render(); announce(roleName(S.role) + ' 화면'); }
    else { var b = app.querySelector('[data-act="switch-role"]'); if (b) b.focus(); }
  }

  /* ───────── 엔딩 ───────── */
  function renderEnding() {
    ui.viewKey = 'ending';
    var c = C.conclusions.FINAL;
    var ans = c.answer;
    var choice = S.shared.endingChoice;
    var hints = E.hintsUsedTotal(S);
    var tries = function (id) { var r = S.shared.concl[id]; return r ? Math.max(0, r.tries - 1) : 0; };
    var wrongBoxes = S.shared.opened.filter(function (b) { return b !== 'C-4'; });
    var sentence = function (s) {
      return s.text.replace(/\{([a-zA-Z]+)\}/g, function (_, k) {
        var f = s.fields.filter(function (x) { return x.id === k; })[0];
        if (f.evidence) return '';
        var o = f.options.filter(function (x) { return x[0] === ans[s.id][k]; })[0];
        return o ? o[1] : '';
      }).replace(/근거:\s*$/, '').trim();
    };
    var support = { s1: ['i_match', 's_photo_onair', 'i_audit'], s2: ['i_bms_light', 's_switch', 'i_bms_access', 's_keybox'], s3: ['i_audit', 's_deskphone'], s4: ['s_receipt', 's_hanphone', 'i_audit'], s5: ['s_boxes', 'i_manifest', 's_ledger', 's_scrap', 's_reel'], s6: ['s_editnote', 's_1999memo', 't_min_edit', 't_han_talkback'] };
    var chips = function (ids) {
      return ids.filter(function (id) { return E.hasFound(S, id); }).map(function (id) {
        return '<button class="chip-btn" data-act="open-ev-any" data-id="' + id + '">' + e(evd(id).title) + '</button>';
      }).join('');
    };
    return '<div class="ending">' +
      '<p class="eyebrow">사건 종결 · ' + (choice === 'air' ? '마지막 송출' : '봉인') + '</p>' +
      '<h1 class="view-title" tabindex="-1">' + e(C.endingTitle) + '</h1>' +
      '<p class="lead">' + (choice === 'air' ? '00:00, 해담FM의 마지막 송출은 27년 전 늦게 나간 경보였다. 원본은 다시 봉인되어 아침을 기다린다.' : '00:00, 해담FM의 송신기가 꺼졌다. 봉인된 원본은 아침에 감사팀 손으로 넘어간다.') + '</p>' +
      '<section class="end-sec"><h2>두 사람이 연결한 사실</h2><ol class="chain">' + c.sentences.map(function (s) {
        return '<li><span class="cat">' + e(s.cat) + '</span><p>' + e(sentence(s)) + '</p><div class="chips-row">' + chips(support[s.id]) + '</div></li>';
      }).join('') + '</ol></section>' +
      '<section class="end-sec"><h2>확인한 실제 시각</h2><ol class="timeline compact">' +
      [['20:00:00', '중앙난방 정지', ['i_bms_env', 's_notice']], ['21:30:10', '금고 봉인 (윤서진·민해수)', ['s_vault', 't_min_seal']],
        ['21:36:12', 'CART 07에 리허설 Take 2 장전 (한도윤)', ['i_cartlog']], ['21:32:00', '윤서진이 Take 2 송출을 부탁하고 키 보관함 앞에 서 있었다 (한도윤 진술)', ['t_han_cart', 't_han_keys']],
        ['21:41:20', '민해수 자료실 출입 → 21:43:50 편집본을 들고 나옴', ['s_editcopy']], ['21:44:40', '한도윤, 옥상에서 감사팀에 제보 전화 (~21:48:55)', ['i_audit']],
        ['21:45:00', '리허설 Take 2 송출 시작', ['i_match']], ['21:47:05', '2층 동측 스위치반에서 복도 조명 OFF', ['i_bms_light']],
        ['21:47:30', '예비 카드 #07로 자료실 출입', ['i_bms_access']], ['21:47:40', '감사팀 확인 전화, 국장실 무응답', ['i_audit', 's_deskphone']],
        ['21:47:50', '금고 개방 (HL-22)', ['i_loggers']], ['21:48:15', '민해수, 접수 창구에서 택배 수령 서명', ['s_receipt']],
        ['21:49:10', '복도 조명 ON', ['i_bms_light']], ['21:50:40', '지하 반출대기실 동작 감지 (~21:53:10) — C-4 재봉인 S-4478', ['i_bms_light', 's_boxes']]
      ].filter(function (r) { return r[2].some(function (id) { return E.hasFound(S, id); }); }).sort(function (a, b) { return U.toSec(a[0]) - U.toSec(b[0]); }).map(function (r) {
        return '<li class="tl std"><span class="tl-time">' + r[0] + '</span><span class="tl-body"><span class="tl-label">' + e(r[1]) + '</span></span></li>';
      }).join('') + '</ol></section>' +
      '<section class="end-sec"><h2>수사 기록</h2><dl class="stats">' +
      '<div><dt>경과 시간</dt><dd>' + (S.shared.elapsedMs ? fmtElapsed(S.shared.elapsedMs) : '—') + ' <small>(화면을 보고 있던 시간, 참고용)</small></dd></div>' +
      '<div><dt>힌트</dt><dd>관찰 ' + hints[1] + ' · 조합 ' + hints[2] + ' · 구체 ' + hints[3] + '</dd></div>' +
      '<div><dt>반려된 결론</dt><dd>1차 ' + tries('IC1') + ' · 2차 ' + tries('IC2') + ' · 최종 ' + tries('FINAL') + '</dd></div>' +
      '<div><dt>잘못 뜯은 봉인</dt><dd>' + (wrongBoxes.length ? e(wrongBoxes.join(', ')) : '없음') + '</dd></div>' +
      '<div><dt>모드</dt><dd>' + (S.mode === 'solo' ? '혼자 검수' : '2인 협동') + '</dd></div></dl>' +
      '<p class="muted small">기록은 이 기기에만 저장되며 어디로도 전송되지 않습니다.</p></section>' +
      '<div class="end-actions"><button class="btn primary" data-act="replay-ending">엔딩 장면 다시 보기</button><button class="btn" data-act="review">수사 화면 다시 보기</button><button class="btn" data-act="to-title">타이틀로</button><button class="btn warn" data-act="reset">처음부터 다시</button></div>' +
      '<p class="fineprint">' + e(C.credits) + '</p></div>';
  }

  /* ───────── 플레이어 ───────── */
  function stopPlayer() {
    if (ui.player) { cancelAnimationFrame(ui.player.raf); ui.player.audio.stop(); ui.player = null; var b = $('#playBtn'); if (b) b.textContent = '▶ 재생'; }
  }
  function playRec(from) {
    var recId = ui.audioSel, rec = C.recordings[recId];
    stopPlayer();
    from = Math.max(0, Math.min(rec.dur - 0.5, from || ui.playPos || 0));
    var audio = AU.playRecording(recId, from, rec.dur - from);
    var t0 = performance.now();
    var p = { audio: audio, raf: 0, from: from };
    ui.player = p;
    var b = $('#playBtn'); if (b) b.textContent = '❚❚ 일시정지';
    var lines = Array.prototype.slice.call(document.querySelectorAll('#script li'));
    var head = document.querySelector('#mainWave .playhead');
    var ptime = $('#ptime');
    var startStd = rec.start ? U.toSec(rec.start) : null;
    var lastIdx = -1;
    (function frame() {
      var t = from + (performance.now() - t0) / 1000;
      if (t >= rec.dur) { ui.playPos = 0; stopPlayer(); return; }
      ui.playPos = t;
      if (head) { var x = (t / rec.dur) * 1000; head.setAttribute('x1', x); head.setAttribute('x2', x); }
      if (ptime) ptime.textContent = U.mmss(t) + (startStd !== null ? ' · ' + U.fmt(startStd + t) : '');
      var idx = -1;
      for (var i = 0; i < lines.length; i++) if (+lines[i].dataset.t <= t) idx = i;
      if (idx !== lastIdx) {
        lines.forEach(function (l, i) { l.classList.toggle('now', i === idx); });
        lastIdx = idx;
      }
      p.raf = requestAnimationFrame(frame);
    })();
  }

  /* ───────── 이동 ───────── */
  function go(name, param, push) {
    R().view = { name: name, param: param || null };
    if (navGroup(name) === 'inv') ui.lastInv[S.role] = { name: name, param: param || null };
    if (push) pushHist('view');
    persist();
    render();
  }
  function back(fromPop) {
    var v = view();
    if (v.name === 'loc') go('map');
    else if (v.name === 'person') go('talk');
    if (!fromPop && ui.viewPushed) { ui.ignorePop++; try { history.back(); } catch (x) { ui.ignorePop--; } }
    ui.viewPushed = false;
  }
  function pushHist(kind) {
    try { history.pushState({ lb: kind, n: Date.now() }, ''); } catch (x) { return; }
    if (kind === 'modal') ui.modalPushed = true;
    if (kind === 'view') ui.viewPushed = true;
  }

  /* ───────── 입력 ───────── */
  function bindGlobal() {
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    modal.addEventListener('cancel', function (ev) { ev.preventDefault(); closeModal(); });
    modal.addEventListener('click', function (ev) { if (ev.target === modal) closeModal(); });
    handoff.addEventListener('cancel', function (ev) { ev.preventDefault(); });
    $('#confirm').addEventListener('cancel', function () { /* 기본 닫힘 허용 */ });
    window.addEventListener('popstate', function () {
      if (ui.ignorePop > 0) { ui.ignorePop--; return; }
      if (modal.open) { ui.modalPushed = false; closeModal(true); return; }
      if (!ui.atTitle && S.phase === 'play') {
        var v = view();
        if (v.name === 'loc' || v.name === 'person') { ui.viewPushed = false; back(true); }
      }
    });
    window.addEventListener('storage', function (ev) {
      if (ev.key !== E.SAVE_KEY || ev.newValue == null || ui.readOnly) return;
      ui.readOnly = true;
      openInfo('다른 탭에서 진행이 바뀌었습니다', '<p>같은 사건 파일을 다른 탭에서 진행했습니다. 이 탭은 더 이상 저장하지 않습니다. 이 탭에서 이어 하려면 페이지를 새로 고치세요.</p>');
    });
    window.addEventListener('pagehide', persistIfChanged);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') persistIfChanged(); });
  }
  function onKey(ev) {
    if (ev.defaultPrevented) return;
    var tag = (ev.target.tagName || '').toLowerCase();
    var inScene = !ui.atTitle && (ui.replay || S.phase === 'prologue' || (S.pending.length && S.phase !== 'title'));
    if (inScene && !modal.open && (ev.key === 'Enter' || ev.key === ' ') && tag !== 'button' && tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
      ev.preventDefault();
      var b = app.querySelector('[data-act="scene-next"],[data-act="scene-action"]');
      if (b) b.click();
    }
    if (modal.open && modal.querySelector('.cctv-viewer') && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && tag !== 'input') {
      ev.preventDefault();
      cctvStep(ev.key === 'ArrowRight' ? 1 : -1);
    }
  }
  function cctvStep(d) {
    var n = ui.cctvIdx + d;
    if (n < 0 || n >= C.cctv.length) return;
    ui.cctvIdx = n; sfx('click');
    refreshCctv();
  }
  function refreshCctv() {
    var holder = modal.querySelector('.ev-body.t-cctv');
    if (holder) { holder.innerHTML = renderCctvViewer(); var b = holder.querySelector('.cctv-list .on'); if (b) b.scrollIntoView({ block: 'nearest' }); }
  }

  function onClick(ev) {
    var t = ev.target.closest('[data-act]');
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true' && t.dataset.act !== 'loc') return;
    var act = t.dataset.act, id = t.dataset.id;
    switch (act) {
      case 'new':
        AU.unlock();
        if (S.phase !== 'title') confirmBox('새 수사를 시작할까요?', '지금까지의 진행과 두 역할의 노트가 모두 지워집니다.', '새로 시작', function () { S = E.resetSave(store); openModeSelect(); });
        else openModeSelect();
        break;
      case 'mode':
        S = E.newState(); S.mode = id; S.phase = 'prologue'; S.prologueStep = 0;
        ui.atTitle = false; ui.sceneLine = 0; ui.drafts = {}; ui.finalDraft = null; ui.lastResults = null;
        persist(); closeModal(); render(); break;
      case 'continue': AU.unlock(); ui.atTitle = false; ui.sceneLine = 0; render(); break;
      case 'howto': openHowto(); break;
      case 'settings': openSettings(); break;
      case 'to-title': closeModal(); ui.atTitle = true; persist(); render(); break;
      case 'reset':
        confirmBox('처음부터 다시 할까요?', '진행, 두 역할의 노트, 가설 보드가 모두 지워집니다. 설정은 유지됩니다.', '모두 지우기', function () {
          closeModal(); S = E.resetSave(store); ui.atTitle = true; ui.drafts = {}; ui.finalDraft = null; ui.lastResults = null; render(); toast('진행을 지웠습니다.');
        });
        break;
      case 'replay-ending':
        if (!S.shared.endingChoice) return;
        AU.unlock();
        ui.replayFromTitle = ui.atTitle;
        ui.replay = { id: 'confront', beat: 0, queue: [S.shared.endingChoice === 'air' ? 'ending_air' : 'ending_seal'] };
        ui.sceneLine = 0; closeModal(); render(); break;
      case 'review': S.phase = 'play'; S.role = S.role || 'seoha'; persist(); render(); break;
      case 'to-ending': if (E.conclDone(S, 'FINAL') && S.shared.endingChoice) { S.phase = 'ending'; persist(); render(); } break;
      case 'scene-next': sceneNext(false); break;
      case 'scene-skip':
        if (ui.replay) { ui.replay = null; ui.atTitle = ui.replayFromTitle; render(); } else sceneNext(true);
        break;
      case 'scene-action': sceneAction(); break;
      case 'scene-choice': sceneChoice(id); break;
      case 'start-role':
        S.role = t.dataset.role; S.phase = 'play'; persist(); render();
        toast(roleName(S.role) + ' · ' + C.roles[S.role].hint);
        break;
      case 'nav':
        var vn = t.dataset.view;
        if (vn === 'inv') {
          // 이미 조사 화면이면 첫 화면(평면도·건물 기록)으로, 다른 화면에서 오면 마지막 조사 화면으로
          var root = { name: S.role === 'seoha' ? 'map' : 'bms', param: null };
          var cur = navGroup(view().name) === 'inv' ? (view().name === 'loc' || view().name === 'person' ? root : view()) : (ui.lastInv[S.role] || root);
          if (cur.name === 'loc' && !E.locationUnlocked(S, cur.param)) cur = { name: 'map', param: null };
          go(cur.name, cur.param);
        }
        else go(vn);
        break;
      case 'go': go(t.dataset.view); break;
      case 'back': back(false); break;
      case 'loc':
        if (!E.locationUnlocked(S, id)) { toast(C.locations[id].lockedHint || '아직 들어갈 수 없다.'); return; }
        sfx('click'); go('loc', id, true); break;
      case 'hotspot': onHotspot(id); break;
      case 'person': go('person', id, true); break;
      case 'ask': onAsk(id); break;
      case 'open-ev': openEvidence(id, null); break;
      case 'open-ev-any': openEvidenceReadonly(id); break;
      case 'ev-tab': openEvidence(id, null, t.dataset.set.split(',')); break;
      case 'ev-filter': ui.evFilter = id; render({ keepScroll: true }); break;
      case 'tl-filter': ui.timelineFilter = id; render({ keepScroll: true }); break;
      case 'close-modal': closeModal(); break;
      case 'zoom':
        var z = modal.querySelector('.zoomable'); if (z) { z.classList.toggle('zoomed'); t.textContent = z.classList.contains('zoomed') ? '원래 크기' : '확대'; }
        else { modal.classList.toggle('full'); t.textContent = modal.classList.contains('full') ? '원래 크기' : '확대'; }
        break;
      case 'quote': quoteToNotes(id); break;
      case 'link':
        E.linkEvidence(S, S.role, t.dataset.who, id, t.dataset.stance || null); persist(); ui.dirty = true;
        t.parentNode.querySelectorAll('.chip-btn').forEach(function (b) { var on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
        announce(person(t.dataset.who).name + ' 가설에 연결을 바꿨습니다');
        break;
      case 'switch-role': requestSwitch(); break;
      case 'handoff-go': finishHandoff(true); break;
      case 'handoff-cancel': finishHandoff(false); break;
      case 'hint': openHint(id); break;
      case 'hint-more':
        var used = S.shared.hints[id] || 0;
        if (used === 2) { confirmBox('구체적 도움을 볼까요?', '정답에 가까운 정보가 포함됩니다.', '보기', function () { E.useHint(S, id); persist(); openHint(id); ui.dirty = true; }); }
        else { E.useHint(S, id); persist(); openHint(id); ui.dirty = true; }
        break;
      case 'joint': openJoint(id); break;
      case 'bms-tab': R().view = { name: 'bms', param: id }; persist(); render({ keepScroll: true, focus: '[data-act="bms-tab"][data-id="' + id + '"]' }); break;
      case 'bms-action':
        var a = C.stations.bms.actions.filter(function (x) { return x.id === id; })[0];
        confirmBox('출입 잠금을 해제할까요?', a.confirm, '해제', function () { var r = E.runAction(S, id); persist(); sfx('beep'); render({ keepScroll: true }); toast(r.text, 'good'); });
        break;
      case 'rec-select': ui.audioSel = id; ui.playPos = 0; render({ keepScroll: true, focus: '[data-act="rec-select"][data-id="' + id + '"]' }); break;
      case 'rec-play': if (ui.player) { stopPlayer(); } else { AU.unlock(); playRec(); } break;
      case 'rec-stop': stopPlayer(); ui.playPos = 0; resetPlayhead(); break;
      case 'rec-seek': ui.playPos = +t.dataset.t; if (ui.player) playRec(ui.playPos); else { resetPlayhead(ui.playPos); } break;
      case 'goto-audio': closeModal(); ui.audioSel = id; go('audio'); break;
      case 'cmp-nudge': setOffset(ui.cmpOffset + parseFloat(t.dataset.d)); break;
      case 'match-submit':
        var res = E.submitJoint(S, 'MATCH', { rec: ui.cmpOther, offset: ui.cmpOffset }); persist();
        if (res.ok) { sfx('success'); toast('음원 대조 결과를 등록했습니다.', 'good'); render({ keepScroll: true }); }
        else { sfx('error'); var mm = $('#matchMsg'); if (mm) mm.textContent = '✗ ' + res.msgs[0]; }
        break;
      case 'cctv-step': cctvStep(+t.dataset.d); break;
      case 'cctv-go': ui.cctvIdx = +t.dataset.i; refreshCctv(); break;
      case 'weigh':
        var w = E.weigh(S, id); persist(); sfx('beep'); openShelf();
        var m = $('#shelfMsg'); if (m) m.textContent = id + ' — ' + w.toFixed(1) + 'kg';
        break;
      case 'open-box': openBox(id); break;
      case 'suspect': E.setSuspect(S, S.role, t.dataset.who, id); persist(); render({ keepScroll: true, focus: '[data-act="suspect"][data-who="' + t.dataset.who + '"][data-id="' + id + '"]' }); break;
    }
  }
  function resetPlayhead(pos) {
    var rec = C.recordings[ui.audioSel];
    var head = document.querySelector('#mainWave .playhead');
    var x = ((pos || 0) / rec.dur) * 1000;
    if (head) { head.setAttribute('x1', x); head.setAttribute('x2', x); }
    var pt = $('#ptime'); if (pt) pt.textContent = U.mmss(pos || 0) + (rec.start ? ' · ' + U.fmt(U.toSec(rec.start) + (pos || 0)) : '');
  }
  function setOffset(v) {
    ui.cmpOffset = Math.max(0, Math.min(60, Math.round(v * 2) / 2));
    var host = $('#cmpWave');
    if (host) host.outerHTML = waveSvg(ui.cmpOther, { compact: true, offset: ui.cmpOffset, baseDur: C.recordings.onair.dur, id: 'cmpWave' });
    var o = $('#cmpOut'); if (o) o.textContent = ui.cmpOffset.toFixed(1) + '초';
    var r = app.querySelector('[data-act="cmp-offset"]'); if (r && +r.value !== ui.cmpOffset) r.value = ui.cmpOffset;
    var m = E.compareMarkers('onair', ui.cmpOther, ui.cmpOffset);
    var mt = $('#cmpMatch'); if (mt) mt.innerHTML = '겹친 표시 <strong>' + m.matched + ' / ' + m.total + '</strong>' + (m.matched === m.total ? ' — 모두 겹친다' : '');
  }
  function onHotspot(hid) {
    var res = E.examine(S, hid);
    if (!res.ok) return;
    persist();
    sfx(res.first ? 'paper' : 'click');
    if (res.action === 'cctv') { ui.cctvIdx = 0; openEvidence('s_cctv', res.first ? res.line : null); ui.dirty = true; return; }
    if (res.action === 'shelf') { E.grant(S, ['s_boxes']); persist(); ui.dirty = true; openShelf(); return; }
    var h = E.HOT[hid];
    var ids = (h.grants || []).filter(function (g) { return E.hasFound(S, g); });
    if (ids.length) openEvidence(ids[0], res.line, ids.length > 1 ? ids : null);
    else openModal(modalFrame(e(h.label), '<p class="monologue">' + e(res.line) + '</p>', '<button class="btn primary" data-act="close-modal" data-autofocus>닫기</button>'), { kind: 'info' });
    if (res.added.length) { ui.dirty = true; announce('증거 ' + res.added.length + '개를 증거함에 넣었습니다'); }
    else ui.dirty = true;
  }
  function onAsk(tid) {
    var res = E.ask(S, tid);
    if (!res.ok) return;
    persist(); sfx('paper');
    render({ keepScroll: true });
    var log = app.querySelector('.qalog li:last-child');
    if (log) { log.setAttribute('tabindex', '-1'); log.focus(); log.classList.add('flash'); }
    if (res.added.length > 1) toast('증거 확보: ' + res.added.slice(1).map(function (x) { return evd(x).title; }).join(', '), 'good');
  }
  function quoteToNotes(id) {
    var r = R(), ev = evd(id);
    var line = '[' + ev.title + '] ' + ev.short;
    r.notes = (r.notes ? r.notes.replace(/\s+$/, '') + '\n' : '') + line;
    E.setNotes(S, S.role, r.notes);
    persist();
    toast('노트에 인용했습니다.');
  }
  function openEvidenceReadonly(id) {
    var ev = evd(id);
    if (!ev || !E.hasFound(S, id)) return;
    var body = '<div class="ev-body t-' + ev.type + '">' + renderEvidenceBody(id) + '</div>';
    openModal(modalFrame(e(ev.title), body, '<button class="btn primary" data-act="close-modal" data-autofocus>닫기</button>', e(roleName(ev.owner)) + '의 증거'), { kind: 'evidence', cls: 'wide' });
  }

  function onChange(ev) {
    var t = ev.target;
    if (t.dataset.setting) {
      var k = t.dataset.setting;
      ST[k] = t.type === 'checkbox' ? t.checked : parseFloat(t.value);
      E.saveSettings(store, ST);
      AU.configure(ST);
      if (k === 'sound' && ST.sound) { AU.unlock(); sfx('beep'); }
      if (modal.open && ui.modal === 'settings') openSettings();
      if (k === 'showTimer' && !ui.atTitle) ui.dirty = true;
      return;
    }
    var act = t.dataset.act;
    if (act === 'tl-corr') { ui.timelineCorr = t.checked; render({ keepScroll: true, focus: '[data-act="tl-corr"]' }); return; }
    if (act === 'cctv-corr') { ui.cctvCorr = t.checked; refreshCctv(); var c = modal.querySelector('[data-act="cctv-corr"]'); if (c) c.focus(); return; }
    if (act === 'cmp-file') { ui.cmpOther = t.value; ui.cmpOffset = 0; render({ keepScroll: true, focus: '[data-act="cmp-file"]' }); return; }
    var form = t.closest('form[data-form="concl"]');
    if (form) { ui.drafts[form.dataset.id] = readConclForm(form); return; }
    var ff = t.closest('form[data-form="final"]');
    if (ff) { ui.finalDraft = readFinalForm(ff); return; }
    if (t.dataset.memo) { E.setSuspectMemo(S, S.role, t.dataset.memo, t.value); persist(); }
  }
  function onInput(ev) {
    var t = ev.target;
    if (t.id === 'notes') {
      E.setNotes(S, S.role, t.value);
      clearTimeout(ui.noteTimer);
      var st = $('#noteState'); if (st) st.textContent = '저장 중…';
      ui.noteTimer = setTimeout(function () { persist(); var s2 = $('#noteState'); if (s2) s2.textContent = '자동 저장됨'; }, 400);
      return;
    }
    if (t.dataset.act === 'cmp-offset') { setOffset(parseFloat(t.value)); return; }
    if (t.dataset.setting === 'volume') { ST.volume = parseFloat(t.value); AU.configure(ST); E.saveSettings(store, ST); }
  }
  function readConclForm(form) {
    var c = C.conclusions[form.dataset.id], out = {};
    c.fields.forEach(function (f) {
      if (f.multi) out[f.id] = Array.prototype.slice.call(form.querySelectorAll('input[name="' + f.id + '"]:checked')).map(function (i) { return i.value; });
      else out[f.id] = form.elements[f.id].value;
    });
    return out;
  }
  function readFinalForm(form) {
    var out = {};
    Array.prototype.forEach.call(form.querySelectorAll('select'), function (s) {
      var p = s.name.split('.');
      out[p[0]] = out[p[0]] || {};
      out[p[0]][p[1]] = s.value;
    });
    return out;
  }
  function onSubmit(ev) {
    var form = ev.target;
    var kind = form.dataset.form;
    if (!kind) return;
    ev.preventDefault();
    if (kind === 'joint') { submitJointForm(form); return; }
    if (kind === 'registry') {
      var q = form.elements.q.value;
      var res = E.searchRegistry(S, q);
      persist();
      var box = $('#regResult');
      if (!res.ok) { box.innerHTML = '<p class="fb bad">4자 이상 입력하세요.</p>'; return; }
      if (!res.hits.length) { box.innerHTML = '<p class="fb bad">“' + e(q) + '”에 맞는 항목이 없습니다.</p>'; sfx('error'); return; }
      sfx('beep');
      box.innerHTML = registryTable(res.hits);
      return;
    }
    if (kind === 'concl') {
      var id = form.dataset.id;
      var input = readConclForm(form);
      ui.drafts[id] = input;
      var r = E.submitConclusion(S, id, input);
      persist();
      ui.lastResults = ui.lastResults || {};
      ui.lastResults[id] = r.results;
      if (r.ok) { sfx('success'); ui.lastResults = null; ui.drafts[id] = null; render(); }
      else { sfx('error'); render({ keepScroll: true, focus: 'form[data-id="' + id + '"] .fb.bad' }); var f = app.querySelector('form[data-id="' + id + '"] .fb.bad'); if (f) { f.setAttribute('tabindex', '-1'); f.focus(); } announce('충돌하는 결론이 있습니다'); }
      return;
    }
    if (kind === 'final') {
      var inp = readFinalForm(form);
      ui.finalDraft = inp;
      var rr = E.submitConclusion(S, 'FINAL', inp);
      persist();
      ui.lastResults = ui.lastResults || {};
      ui.lastResults.FINAL = rr.results;
      if (rr.ok) { sfx('success'); ui.lastResults = null; ui.finalDraft = null; render(); }
      else {
        sfx('error');
        render({ keepScroll: true });
        var bad = app.querySelector('.sentence.bad .fb'); if (bad) { bad.setAttribute('tabindex', '-1'); bad.focus(); }
        announce(rr.results.filter(function (x) { return !x.ok; }).length + '개 문장이 기록과 충돌합니다');
      }
    }
  }

  function mountDynamic() {
    // 렌더 직후 필요한 동적 요소 없음 (재생기는 버튼으로 시작)
  }

  LB.ui = { boot: boot, _state: function () { return S; }, _ui: ui };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
