/*
 * 마지막 송출 — 효과음 (Web Audio 합성, 외부 파일 없음)
 * 사용자가 [시작]·[이어하기] 같은 버튼을 누른 뒤에만 AudioContext를 만든다.
 * 소리를 꺼도 게임 진행에 필요한 정보는 화면에 모두 표시된다. 음성 합성(TTS)은 쓰지 않는다.
 */
(function (root) {
  'use strict';
  var LB = (root.LB = root.LB || {});
  var ctx = null, master = null, noiseBuf = null, amb = null;
  var enabled = true, volume = 0.6, ambienceOn = false, unlocked = false;

  function ensure() {
    if (!enabled || !unlocked) return null;
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(t, dur, type, freq, q, peak, dest) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    var g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    src.connect(f); f.connect(g); g.connect(dest || master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return { src: src, f: f, g: g };
  }
  function tone(t, freq, dur, type, peak, dest) {
    var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    var g = ctx.createGain(); env(g, t, 0.006, peak, dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  var SFX = {
    click: function (t) { tone(t, 1400, 0.03, 'square', 0.04); },
    relay: function (t) { noise(t, 0.012, 'highpass', 2000, 0.7, 0.3); noise(t + 0.045, 0.01, 'highpass', 2500, 0.7, 0.2); },
    paper: function (t) { var n = noise(t, 0.28, 'bandpass', 2600, 0.8, 0.12); n.f.frequency.linearRampToValueAtTime(5200, t + 0.28); },
    shutter: function (t) { noise(t, 0.02, 'highpass', 3000, 0.7, 0.35); noise(t + 0.07, 0.03, 'highpass', 1800, 0.7, 0.25); },
    rumble: function (t) {
      var n = noise(t, 1.6, 'lowpass', 180, 0.8, 0.5);
      var lfo = ctx.createOscillator(); lfo.frequency.value = 14; var lg = ctx.createGain(); lg.gain.value = 0.25;
      lfo.connect(lg); lg.connect(n.g.gain); lfo.start(t); lfo.stop(t + 1.7);
    },
    beep: function (t) { tone(t, 880, 0.12, 'sine', 0.1); },
    success: function (t) { tone(t, 660, 0.16, 'triangle', 0.12); tone(t + 0.12, 990, 0.26, 'triangle', 0.1); },
    error: function (t) { tone(t, 170, 0.18, 'square', 0.05); },
    handoff: function (t) { var o = tone(t, 420, 0.4, 'sine', 0.07); o.frequency.exponentialRampToValueAtTime(220, t + 0.4); },
    tape: function (t) { tone(t, 58, 0.5, 'sawtooth', 0.04); SFX.relay(t + 0.02); },
    cough: function (t, dest) { noise(t, 0.16, 'bandpass', 700, 1.4, 0.5, dest); noise(t + 0.03, 0.1, 'bandpass', 1500, 1.2, 0.2, dest); },
    clank: function (t, dest) {
      [1830, 2770, 4120].forEach(function (f, i) { tone(t, f, 0.14 - i * 0.03, 'sine', 0.16 / (i + 1), dest); });
      noise(t, 0.01, 'highpass', 4000, 0.7, 0.2, dest);
    },
    page: function (t, dest) { var n = noise(t, 0.32, 'bandpass', 2400, 0.7, 0.18, dest); n.f.frequency.linearRampToValueAtTime(5600, t + 0.32); }
  };

  function sfx(name) {
    if (!ensure() || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.01); } catch (e) { /* 재생 실패는 무시 */ }
  }

  /* 녹음 재생: from초부터 dur초 동안. 반환값의 stop()으로 중단한다. */
  function playRecording(recId, from, dur) {
    if (!ensure()) return { stop: function () {} };
    var C = LB.CASE, rec = C.recordings[recId], E = LB.engine;
    var bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    var t0 = ctx.currentTime + 0.05, end = Math.min(rec.dur, from + dur);
    var nodes = [];
    // 말소리 대역의 웅얼거림 (내용은 화면 원고로 제공)
    var wave = LB.art.waveform(recId);
    var vsrc = ctx.createBufferSource(); vsrc.buffer = noiseBuf; vsrc.loop = true;
    var vf = ctx.createBiquadFilter(); vf.type = 'bandpass'; vf.frequency.value = 520; vf.Q.value = 1.1;
    var vg = ctx.createGain(); vg.gain.value = 0.0001;
    vsrc.connect(vf); vf.connect(vg); vg.connect(bus); vsrc.start(t0); vsrc.stop(t0 + (end - from) + 0.1);
    nodes.push(vsrc);
    var mo = null;
    for (var s = from; s < end; s += 0.25) {
      var idx = Math.floor(s * 4), seg = segAt(rec, s), at = t0 + (s - from);
      var amp = wave[idx] || 0;
      if (seg === 'voice') {
        vg.gain.setTargetAtTime(Math.max(0.0001, amp * 0.22), at, 0.03);
        vf.frequency.setTargetAtTime(420 + amp * 380, at, 0.05);
      } else vg.gain.setTargetAtTime(0.0001, at, 0.05);
    }
    // 음악 구간: 낮은 화음
    rec.segments.forEach(function (sg) {
      if (sg[2] !== 'music') return;
      var a = Math.max(from, sg[0]), b = Math.min(end, sg[1]);
      if (b <= a) return;
      [196, 247, 294].forEach(function (f, i) {
        var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f * (i === 1 && Math.floor(a / 8) % 2 ? 1.06 : 1);
        var g = ctx.createGain(); g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.025, t0 + (a - from), 0.3); g.gain.setTargetAtTime(0.0001, t0 + (b - from) - 0.4, 0.2);
        o.connect(g); g.connect(bus); o.start(t0 + (a - from)); o.stop(t0 + (b - from) + 0.2); nodes.push(o);
      });
    });
    E.recMarkers(recId).forEach(function (m) {
      if (m[0] < from || m[0] >= end) return;
      var at = t0 + (m[0] - from);
      if (m[1] === 'coughfit') { for (var k = 0; k < 6; k++) SFX.cough(at + k * 0.9, bus); }
      else if (SFX[m[1]]) SFX[m[1]](at, bus);
    });
    return {
      stop: function () {
        try { bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03); } catch (e) { /* ignore */ }
        setTimeout(function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ignore */ } }); try { bus.disconnect(); } catch (e) { /* ignore */ } }, 120);
      }
    };
  }
  function segAt(rec, s) {
    for (var i = 0; i < rec.segments.length; i++) if (s >= rec.segments[i][0] && s < rec.segments[i][1]) return rec.segments[i][2];
    return null;
  }

  function startAmbience() {
    if (!ensure() || amb) return;
    var g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    var hum = ctx.createOscillator(); hum.frequency.value = 50; var hg = ctx.createGain(); hg.gain.value = 0.02;
    hum.connect(hg); hg.connect(g); hum.start();
    var n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    var ng = ctx.createGain(); ng.gain.value = 0.03; n.connect(f); f.connect(ng); ng.connect(g); n.start();
    g.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    amb = { g: g, nodes: [hum, n] };
  }
  function stopAmbience() {
    if (!amb || !ctx) { amb = null; return; }
    var a = amb; amb = null;
    a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    setTimeout(function () { a.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ignore */ } }); }, 900);
  }

  LB.audio = {
    /* 사용자 조작 직후 호출 */
    unlock: function () { unlocked = true; if (enabled) { ensure(); if (ambienceOn) startAmbience(); } },
    configure: function (st) {
      enabled = !!st.sound; volume = Math.max(0, Math.min(1, st.volume)); ambienceOn = !!st.ambience;
      if (master) master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.05);
      if (!enabled) stopAmbience();
      else if (unlocked) { ensure(); if (ambienceOn) startAmbience(); else stopAmbience(); }
    },
    sfx: sfx,
    playRecording: playRecording,
    active: function () { return !!ctx && enabled && unlocked; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
