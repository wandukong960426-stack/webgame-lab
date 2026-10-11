/*
 * 마지막 송출 — 직접 그린 SVG 자산
 * 외부 이미지 없이 장면·물건·인물을 그린다. 모든 그림은 장식(aria-hidden)이며
 * 같은 정보는 텍스트로도 제공된다.
 */
(function (root) {
  'use strict';
  var LB = (root.LB = root.LB || {});

  var P = {
    ink: '#0b0e11', wall: '#1a2228', wall2: '#222c33', floor: '#141a1e', line: '#3a4750',
    dim: '#56646d', paper: '#d8cdb3', amber: '#e8a63a', red: '#d65a43', cyan: '#6fb6c6', green: '#5fbf7f', white: '#e9e3d6'
  };

  function svg(vb, body, cls) {
    return '<svg class="art ' + (cls || '') + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + DEFS + body + '</svg>';
  }
  var DEFS = '<defs>' +
    '<radialGradient id="lbLamp" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#e8a63a" stop-opacity=".28"/><stop offset="1" stop-color="#e8a63a" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="lbVignette" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></radialGradient>' +
    '<linearGradient id="lbFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2328"/><stop offset="1" stop-color="#0d1114"/></linearGradient>' +
    '<linearGradient id="lbMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b969c"/><stop offset=".5" stop-color="#4c565c"/><stop offset="1" stop-color="#9aa4a9"/></linearGradient>' +
    '<filter id="lbGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>' +
    '</defs>';

  function vignette(w, h) { return '<rect width="' + w + '" height="' + h + '" fill="url(#lbVignette)"/>'; }
  function room(back) {
    return '<rect width="800" height="450" fill="' + (back || P.wall) + '"/>' +
      '<path d="M0 330 L800 330 L800 450 L0 450Z" fill="url(#lbFloor)"/>' +
      '<path d="M0 330 H800" stroke="' + P.line + '" stroke-width="2"/>';
  }
  function lamp(x, w) {
    return '<rect x="' + (x - 40) + '" y="0" width="80" height="8" fill="#2f3a41"/>' +
      '<path d="M' + (x - 40) + ' 8 L' + (x - (w || 220)) + ' 330 L' + (x + (w || 220)) + ' 330 L' + (x + 40) + ' 8Z" fill="url(#lbLamp)"/>';
  }
  function onair(x, y, on, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      (on ? '<rect x="-6" y="-6" width="112" height="48" rx="6" fill="' + P.red + '" opacity=".45" filter="url(#lbGlow)"/>' : '') +
      '<rect width="100" height="36" rx="4" fill="' + (on ? P.red : '#3b2523') + '" stroke="#120c0b" stroke-width="3"/>' +
      '<text x="50" y="24" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="16" letter-spacing="2" fill="' + (on ? '#fff3ea' : '#7a5550') + '">ON AIR</text></g>';
  }
  function speaker(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle r="26" fill="#2a3238" stroke="#45525a" stroke-width="3"/>' +
      '<circle r="17" fill="#161b1f"/><circle r="4" fill="#3b464d"/>' +
      '<path d="M34 -10 q8 10 0 20 M44 -18 q14 18 0 36" stroke="' + P.amber + '" stroke-width="2.5" fill="none" opacity=".7"/></g>';
  }
  function door(x, y, w, h, label, glass) {
    return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (glass ? '#0e1418' : '#2b353c') + '" stroke="#4a5760" stroke-width="3"/>' +
      (glass ? '<path d="M' + (x + 8) + ' ' + (y + 10) + ' l30 0 l-40 80" stroke="#6fb6c6" stroke-opacity=".18" stroke-width="6"/>' : '<circle cx="' + (x + w - 14) + '" cy="' + (y + h / 2) + '" r="4" fill="' + P.amber + '"/>') +
      (label ? '<text x="' + (x + w / 2) + '" y="' + (y - 8) + '" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">' + label + '</text>' : '') + '</g>';
  }
  function exitSign(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="-4" y="-4" width="58" height="26" rx="3" fill="' + P.green + '" opacity=".35" filter="url(#lbGlow)"/>' +
      '<rect width="50" height="18" rx="2" fill="#1f6b3d"/><text x="25" y="13" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#d8ffe4">비상구</text></g>';
  }
  function reel(cx, cy, r, full, metal, leader) {
    var hub = metal ? r * 0.36 : r * 0.22;
    var spokes = '';
    for (var i = 0; i < 3; i++) {
      var a = i * 2.094 + 0.5, x1 = cx + Math.cos(a) * hub * 1.2, y1 = cy + Math.sin(a) * hub * 1.2;
      spokes += '<ellipse cx="' + (cx + Math.cos(a) * r * 0.62) + '" cy="' + (cy + Math.sin(a) * r * 0.62) + '" rx="' + (r * 0.2) + '" ry="' + (r * 0.13) + '" transform="rotate(' + (a * 57.3) + ' ' + (cx + Math.cos(a) * r * 0.62) + ' ' + (cy + Math.sin(a) * r * 0.62) + ')" fill="#0b0e11"/>';
      spokes += '<path d="M' + x1 + ' ' + y1 + 'L' + x1 + ' ' + y1 + '" />';
    }
    return '<g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (metal ? 'url(#lbMetal)' : '#c9c3b4') + '" stroke="#1a1f22" stroke-width="3"/>' +
      (full ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.86) + '" fill="#3a2a20"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.84) + '" fill="none" stroke="#5a4232" stroke-width="1" opacity=".6"/>' : '') +
      (full ? '' : spokes) +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + hub + '" fill="' + (metal ? '#30383d' : '#a8a293') + '" stroke="#111" stroke-width="2"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (hub * 0.35) + '" fill="#0b0e11"/>' +
      (leader ? '<path d="M' + (cx + r * 0.86) + ' ' + cy + ' q' + (r * 0.4) + ' ' + (r * 0.2) + ' ' + (r * 0.75) + ' ' + (r * 0.55) + '" stroke="' + leader + '" stroke-width="' + Math.max(4, r * 0.07) + '" fill="none" stroke-linecap="round"/>' : '') + '</g>';
  }
  function figure(x, y, s, opt) {
    opt = opt || {};
    var body = opt.ir ? '#5d6a63' : (opt.color || '#3b454c');
    var g = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="168" rx="34" ry="8" fill="#000" opacity=".35"/>' +
      '<path d="M-26 40 Q-30 120 -22 ' + (opt.coat ? 160 : 120) + ' L22 ' + (opt.coat ? 160 : 120) + ' Q30 120 26 40 Q0 28 -26 40Z" fill="' + body + '"/>' +
      (opt.coat ? '' : '<path d="M-16 120 L-14 166 M14 120 L12 166" stroke="' + body + '" stroke-width="14" stroke-linecap="round"/>') +
      '<circle cx="0" cy="20" r="17" fill="' + (opt.ir ? '#3e4843' : '#5a5048') + '"/>' +
      (opt.hair ? '<path d="M-18 18 Q-16 -4 0 0 Q18 -4 18 20 L18 30 Q12 12 0 10 Q-12 12 -18 30Z" fill="' + opt.hair + '"/>' : '');
    var gl = opt.ir ? '#f4fff8' : '#ecebe6';
    if (opt.gloves) g += '<circle cx="-28" cy="' + (opt.box ? 76 : 104) + '" r="7" fill="' + gl + '"' + (opt.ir ? ' filter="url(#lbGlow)"' : '') + '/><circle cx="28" cy="' + (opt.box ? 76 : 104) + '" r="7" fill="' + gl + '"' + (opt.ir ? ' filter="url(#lbGlow)"' : '') + '/>';
    if (opt.gloves && opt.ir) g += '<circle cx="-28" cy="' + (opt.box ? 76 : 104) + '" r="5" fill="#fff"/><circle cx="28" cy="' + (opt.box ? 76 : 104) + '" r="5" fill="#fff"/>';
    if (opt.box) g += '<rect x="' + (-opt.box / 2) + '" y="' + (78 - opt.box) + '" width="' + opt.box + '" height="' + opt.box + '" fill="' + (opt.ir ? '#8e9a92' : '#7d7466') + '" stroke="#222" stroke-width="2"/>';
    return g + '</g>';
  }

  /* ───────── 장면 ───────── */
  var scenes = {
    sceneLobby: function () {
      return svg('0 0 800 450', room('#1c2429') + lamp(400, 300) +
        '<rect x="40" y="70" width="170" height="210" fill="#232c32" stroke="#3a4750" stroke-width="2"/>' +
        '<rect x="56" y="88" width="138" height="20" fill="' + P.paper + '" opacity=".75"/><rect x="56" y="118" width="96" height="10" fill="' + P.paper + '" opacity=".5"/>' +
        '<rect x="56" y="136" width="118" height="10" fill="' + P.paper + '" opacity=".5"/><rect x="56" y="154" width="80" height="10" fill="' + P.paper + '" opacity=".5"/>' +
        '<text x="125" y="62" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">게시판</text>' +
        speaker(520, 70) + onair(560, 120, false, 0.9) +
        door(620, 160, 160, 170, '복도 유리문', true) +
        '<rect x="70" y="300" width="40" height="60" fill="#2b353c"/><path d="M80 300 l-6 -50 M92 300 l4 -58 M100 300 l10 -40" stroke="#56646d" stroke-width="4"/>' +
        '<path d="M88 248 q8 -10 16 0" stroke="#6fb6c6" stroke-width="3" fill="none" opacity=".6"/>' +
        '<text x="400" y="230" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="#d8cdb3" opacity=".22" letter-spacing="6">해담FM 98.7</text>' +
        vignette(800, 450), 'art-scene');
    },
    sceneLobbyDark: function () {
      return svg('0 0 800 450', room('#1c2429') + lamp(400, 300) +
        speaker(520, 70) + onair(560, 120, false, 0.9) +
        '<rect x="620" y="160" width="160" height="170" fill="#03050a" stroke="#4a5760" stroke-width="3"/>' + exitSign(675, 180) +
        '<text x="400" y="230" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="#d8cdb3" opacity=".22" letter-spacing="6">해담FM 98.7</text>' +
        vignette(800, 450), 'art-scene');
    },
    sceneRecords: function () {
      return svg('0 0 800 450', room('#1e2427') + lamp(380, 260) +
        '<rect x="60" y="100" width="180" height="120" fill="#11171b" stroke="#3a4750" stroke-width="3"/><rect x="70" y="110" width="160" height="100" fill="#0a0e11"/>' +
        '<text x="150" y="92" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">접수 창구 (바깥쪽)</text>' +
        '<rect x="150" y="150" width="40" height="64" fill="' + P.paper + '" opacity=".85" transform="rotate(6 170 180)"/>' +
        '<rect x="200" y="300" width="400" height="24" fill="#3a3026"/><rect x="220" y="324" width="360" height="80" fill="#2d251e"/>' +
        '<rect x="370" y="330" width="60" height="22" fill="#4a3d30" stroke="#1a140f"/><rect x="370" y="358" width="60" height="22" fill="#4a3d30" stroke="#1a140f"/>' +
        '<rect x="520" y="100" width="130" height="80" fill="#c7c1b4" rx="4"/><rect x="530" y="80" width="110" height="26" fill="' + P.paper + '"/>' +
        '<circle cx="625" cy="160" r="5" fill="' + P.green + '"/>' +
        '<rect x="700" y="80" width="40" height="40" rx="4" fill="#2a3238" stroke="#56646d"/><text x="720" y="105" text-anchor="middle" font-size="9" font-family="monospace" fill="' + P.amber + '">HL</text>' +
        vignette(800, 450), 'art-scene');
    },
    sceneGuard: function () {
      var mon = '';
      for (var i = 0; i < 4; i++) mon += '<rect x="' + (180 + (i % 2) * 150) + '" y="' + (90 + Math.floor(i / 2) * 100) + '" width="140" height="90" fill="#0c1612" stroke="#3a4750" stroke-width="3"/>' +
        '<rect x="' + (186 + (i % 2) * 150) + '" y="' + (96 + Math.floor(i / 2) * 100) + '" width="128" height="78" fill="' + (i === 0 ? '#22302a' : '#101a16') + '"/>' +
        (i === 0 ? '<text x="' + 192 + '" y="' + 110 + '" font-family="monospace" font-size="9" fill="#bfe8cf">CAM-1 복도</text>' : '<text x="' + (192 + (i % 2) * 150) + '" y="' + (110 + Math.floor(i / 2) * 100) + '" font-family="monospace" font-size="9" fill="#5a7a68">NO SIGNAL</text>');
      return svg('0 0 800 450', room('#1a2126') + lamp(330, 240) + mon +
        '<rect x="160" y="300" width="360" height="30" fill="#2b353c"/><rect x="250" y="280" width="140" height="22" fill="#1d2428" stroke="#56646d"/><circle cx="372" cy="291" r="4" fill="' + P.red + '"/>' +
        '<text x="320" y="296" text-anchor="middle" font-family="monospace" font-size="10" fill="' + P.amber + '">DVR ● REC</text>' +
        '<rect x="580" y="250" width="150" height="100" fill="' + P.paper + '" opacity=".8" transform="rotate(-4 655 300)"/>' +
        '<path d="M600 280 h100 M600 296 h80 M600 312 h96" stroke="#5a5040" stroke-width="2" transform="rotate(-4 655 300)"/>' +
        vignette(800, 450), 'art-scene');
    },
    sceneHall: function () {
      return svg('0 0 800 450', '<rect width="800" height="450" fill="#161d22"/>' +
        '<path d="M0 0 L300 150 L500 150 L800 0Z" fill="#1d262c"/><path d="M0 450 L300 290 L500 290 L800 450Z" fill="url(#lbFloor)"/>' +
        '<path d="M0 0 L300 150 L300 290 L0 450Z" fill="#1a2227"/><path d="M800 0 L500 150 L500 290 L800 450Z" fill="#1a2227"/>' +
        '<rect x="300" y="150" width="200" height="140" fill="#11171b"/>' +
        '<rect x="355" y="175" width="90" height="115" fill="#2b353c" stroke="#4a5760" stroke-width="3"/>' + exitSign(375, 158) +
        '<path d="M170 105 L250 135 L250 300 L170 330Z" fill="#2b353c" stroke="#4a5760" stroke-width="2"/><circle cx="240" cy="220" r="4" fill="' + P.amber + '"/>' +
        '<text x="210" y="96" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">자료실</text>' +
        '<path d="M630 105 L550 135 L550 300 L630 330Z" fill="#2b353c" stroke="#4a5760" stroke-width="2"/>' +
        '<text x="590" y="96" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">송출실</text>' +
        '<text x="400" y="140" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">동측 계단</text>' +
        '<rect x="60" y="30" width="60" height="26" rx="4" fill="#2a3238"/><circle cx="104" cy="43" r="8" fill="#0b0e11" stroke="#56646d" stroke-width="2"/><circle cx="104" cy="43" r="3" fill="' + P.red + '"/>' +
        vignette(800, 450), 'art-scene');
    },
    sceneArchive: function () {
      var shelves = '';
      for (var r = 0; r < 4; r++) {
        shelves += '<rect x="470" y="' + (80 + r * 60) + '' + '" width="280" height="6" fill="#4a3d30"/>';
        for (var b = 0; b < 9; b++) {
          var empty = r === 1 && b === 4;
          if (!empty) shelves += '<rect x="' + (476 + b * 30) + '" y="' + (40 + r * 60 + (b % 3) * 3) + '" width="24" height="' + (40 - (b % 3) * 3) + '" fill="' + ['#3b4a52', '#57483a', '#2f3a35'][b % 3] + '"/>';
          else shelves += '<rect x="' + (476 + b * 30) + '" y="' + (44 + r * 60) + '" width="24" height="36" fill="none" stroke="' + P.amber + '" stroke-dasharray="4 3"/>';
        }
      }
      return svg('0 0 800 450', room('#1b2125') + lamp(360, 260) + shelves +
        '<text x="610" y="30" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">열린 선반</text>' +
        '<rect x="140" y="150" width="200" height="200" fill="#3a4248" stroke="#1a1f22" stroke-width="4"/>' +
        '<rect x="156" y="166" width="168" height="168" fill="#2c3338" stroke="#4d575d" stroke-width="2"/>' +
        '<circle cx="240" cy="250" r="34" fill="#20262a" stroke="url(#lbMetal)" stroke-width="6"/><path d="M240 222 v12 M240 266 v12 M212 250 h12 M256 250 h12" stroke="#8b969c" stroke-width="3"/>' +
        '<path d="M330 166 v168" stroke="#efe4c8" stroke-width="10" opacity=".85"/><path d="M325 214 l12 6 M325 262 l12 -4" stroke="#7a3328" stroke-width="2"/>' +
        '<rect x="200" y="320" width="40" height="22" rx="3" fill="#2a3238" stroke="#56646d"/>' +
        '<rect x="44" y="96" width="36" height="36" rx="4" fill="#2a3238" stroke="#56646d"/>' +
        '<rect x="384" y="70" width="70" height="40" fill="#30352f" stroke="#4a5760"/><text x="419" y="94" text-anchor="middle" font-family="system-ui" font-size="10" fill="' + P.dim + '">바인더</text>' +
        '<rect x="680" y="320" width="70" height="40" fill="#e9e3d6" opacity=".8"/><text x="715" y="345" text-anchor="middle" font-family="system-ui" font-size="11" fill="#333">면장갑</text>' +
        vignette(800, 450), 'art-scene');
    },
    sceneStudio: function () {
      return svg('0 0 800 450', room('#1d1f24') +
        '<g opacity=".6">' + (function () { var s = ''; for (var i = 0; i < 16; i++) for (var j = 0; j < 5; j++) s += '<rect x="' + (i * 50 + 4) + '" y="' + (j * 56 + 20) + '" width="42" height="48" fill="#262a31"/>'; return s; })() + '</g>' +
        lamp(420, 200) +
        '<rect x="40" y="250" width="140" height="100" fill="#4a4f52" stroke="#1a1d1f" stroke-width="3"/>' +
        (function () { var s = ''; for (var i = 0; i < 9; i++) s += '<rect x="' + (48 + i * 14) + '" y="256" width="8" height="88" fill="#5d6366"/>'; return s; })() +
        '<rect x="196" y="250" width="26" height="26" rx="3" fill="#2a3238" stroke="#56646d"/>' +
        '<rect x="340" y="250" width="200" height="16" fill="#3a3026"/><rect x="370" y="266" width="140" height="70" fill="#2d251e"/>' +
        '<rect x="400" y="200" width="90" height="56" fill="' + P.paper + '" transform="rotate(-8 445 228)"/>' +
        '<path d="M430 80 L430 160 Q430 180 410 190" stroke="#56646d" stroke-width="6" fill="none"/><rect x="396" y="180" width="30" height="46" rx="12" fill="#2a2f33" stroke="#555d62"/>' +
        '<rect x="660" y="110" width="110" height="220" fill="#2b2f35" stroke="#45505a" stroke-width="4"/>' + onair(665, 60, false, 1) +
        vignette(800, 450), 'art-scene');
    },
    sceneSub: function () {
      var faders = '';
      for (var i = 0; i < 12; i++) {
        var y = i === 0 ? 352 : (i === 6 ? 312 : 330 + (i * 7 % 18));
        faders += '<rect x="' + (180 + i * 34) + '" y="300" width="6" height="64" fill="#111"/><rect x="' + (172 + i * 34) + '" y="' + y + '" width="22" height="10" fill="#cfd6d9"/>';
        if (i === 6) faders += '<rect x="' + (172 + i * 34) + '" y="286" width="22" height="10" rx="2" fill="' + P.green + '"/>';
      }
      return svg('0 0 800 450', room('#171c21') +
        '<rect x="80" y="60" width="520" height="170" fill="#0b1014" stroke="#3a4750" stroke-width="5"/>' +
        '<rect x="88" y="68" width="504" height="154" fill="#1d1f24" opacity=".85"/>' +
        '<text x="340" y="150" text-anchor="middle" font-family="system-ui" font-size="16" fill="' + P.dim + '">스튜디오 A (유리창 너머)</text>' +
        '<path d="M120 260 L640 260 L700 400 L60 400Z" fill="#2a3036" stroke="#45505a" stroke-width="3"/>' + faders +
        '<text x="183" y="378" font-family="monospace" font-size="10" fill="' + P.amber + '">MIC1</text><text x="378" y="282" font-family="monospace" font-size="10" fill="' + P.green + '">CART07</text>' +
        '<rect x="580" y="330" width="80" height="54" fill="' + P.paper + '" transform="rotate(10 620 357)"/>' +
        '<rect x="700" y="80" width="70" height="120" rx="4" fill="#2a3238" stroke="#56646d" stroke-width="3"/>' +
        '<circle cx="720" cy="110" r="4" fill="#9aa4a9"/><circle cx="750" cy="110" r="4" fill="#9aa4a9"/><circle cx="720" cy="150" r="4" fill="#9aa4a9"/><circle cx="750" cy="150" r="4" fill="#9aa4a9"/>' +
        '<rect x="744" y="114" width="12" height="20" fill="#e9e3d6"/><rect x="714" y="154" width="12" height="20" fill="#cfa86a"/>' +
        vignette(800, 450), 'art-scene');
    },
    sceneOffice: function () {
      return svg('0 0 800 450', room('#1f2326') + lamp(400, 240) +
        '<rect x="80" y="40" width="200" height="140" fill="#0a0f14" stroke="#3a4750" stroke-width="4"/><path d="M90 50 l40 120 M150 50 l40 120 M210 50 l40 120" stroke="#6fb6c6" stroke-opacity=".15" stroke-width="2"/>' +
        '<rect x="260" y="270" width="320" height="24" fill="#3e3127"/><rect x="280" y="294" width="280" height="90" fill="#30261e"/>' +
        '<rect x="380" y="226" width="64" height="44" rx="5" fill="#2a3238" stroke="#56646d"/><rect x="388" y="232" width="48" height="18" fill="#0f2a1c"/><circle cx="430" cy="258" r="4" fill="' + P.red + '"/>' +
        '<rect x="600" y="160" width="120" height="70" rx="4" fill="#c7c1b4"/><rect x="616" y="140" width="88" height="26" fill="' + P.paper + '"/>' +
        '<path d="M120 330 L170 330 L162 400 L128 400Z" fill="#3a4248" stroke="#1a1f22" stroke-width="2"/><path d="M134 336 q14 -10 26 0" stroke="' + P.paper + '" stroke-width="5" fill="none"/>' +
        '<path d="M738 110 v40" stroke="#56646d" stroke-width="5"/><path d="M712 150 Q738 140 764 150 L772 330 L704 330Z" fill="#3b2f2a"/>' +
        vignette(800, 450), 'art-scene');
    },
    sceneEast2: function () {
      return svg('0 0 800 450', '<rect width="800" height="450" fill="#161c20"/>' +
        '<path d="M420 450 L520 360 L600 360 L700 280 L780 280 L800 260 L800 450Z" fill="#232b30"/>' +
        '<path d="M520 360 h80 M700 280 h80" stroke="#3a4750" stroke-width="3"/>' +
        '<path d="M520 380 L800 380 M560 420 L800 420" stroke="#2a3338" stroke-width="2"/>' +
        '<rect x="230" y="110" width="160" height="200" fill="#2f383e" stroke="#56646d" stroke-width="4"/>' +
        '<path d="M390 110 L440 130 L440 330 L390 310Z" fill="#3a444b" stroke="#56646d" stroke-width="3"/>' +
        '<rect x="250" y="140" width="120" height="40" fill="#1a2024"/><rect x="262" y="148" width="20" height="24" fill="#cfd6d9"/><rect x="300" y="148" width="20" height="24" fill="#cfd6d9"/><rect x="338" y="148" width="20" height="24" fill="#cfd6d9"/>' +
        '<text x="272" y="200" text-anchor="middle" font-size="10" font-family="system-ui" fill="' + P.dim + '">1F복도</text><text x="310" y="200" text-anchor="middle" font-size="10" font-family="system-ui" fill="' + P.dim + '">계단</text><text x="348" y="200" text-anchor="middle" font-size="10" font-family="system-ui" fill="' + P.dim + '">B1</text>' +
        '<path d="M392 180 q6 4 2 10" stroke="#fff" stroke-width="2" fill="none"/>' +
        '<rect x="40" y="90" width="120" height="240" fill="#2b353c" stroke="#4a5760" stroke-width="3"/><text x="100" y="80" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">편성국장실</text>' +
        vignette(800, 450), 'art-scene');
    },
    sceneRoof: function () {
      var rain = '';
      var rnd = LB.util ? LB.util.rng(5) : Math.random;
      for (var i = 0; i < 70; i++) { var x = rnd() * 800, y = rnd() * 260; rain += '<path d="M' + x + ' ' + y + ' l-6 18" stroke="#9fc3d0" stroke-opacity=".35" stroke-width="1.5"/>'; }
      return svg('0 0 800 450', '<rect width="800" height="450" fill="#10161b"/>' +
        '<rect x="0" y="0" width="800" height="260" fill="#0a0f14"/>' + rain +
        '<path d="M680 260 L700 40 L720 260Z M690 150 h20 M686 200 h28 M694 100 h12" stroke="#3a4750" stroke-width="4" fill="none"/>' +
        '<circle cx="700" cy="38" r="6" fill="' + P.red + '"/><circle cx="700" cy="38" r="16" fill="' + P.red + '" opacity=".4" filter="url(#lbGlow)"/>' +
        '<rect x="0" y="260" width="800" height="190" fill="#1a2126"/>' +
        '<rect x="160" y="150" width="180" height="230" fill="#2f383e" stroke="#56646d" stroke-width="4"/><rect x="170" y="160" width="160" height="210" fill="#0d1216"/>' +
        '<ellipse cx="250" cy="400" rx="130" ry="16" fill="#6fb6c6" opacity=".18"/>' +
        '<path d="M500 250 L520 400" stroke="#2c2c2c" stroke-width="5"/><path d="M470 260 Q510 210 552 262" fill="#26343c" stroke="#3a4a52" stroke-width="3"/><path d="M520 400 q-6 10 -14 4" stroke="#888" stroke-width="4" fill="none"/>' +
        vignette(800, 450), 'art-scene');
    },
    sceneStaging: function () {
      var boxes = '';
      for (var i = 0; i < 6; i++) {
        var x = 200 + (i % 3) * 120, y = i < 3 ? 120 : 230;
        boxes += '<rect x="' + x + '" y="' + y + '" width="100" height="80" fill="#8a2f26" stroke="#3a120f" stroke-width="3"/>' +
          '<rect x="' + (x + 30) + '" y="' + (y + 30) + '" width="40" height="18" fill="#f3e9d0"/><text x="' + (x + 50) + '" y="' + (y + 22) + '" text-anchor="middle" font-family="monospace" font-size="12" fill="#f3e9d0">C-' + (i + 1) + '</text>';
      }
      return svg('0 0 800 450', room('#171d21') + lamp(400, 300) +
        '<rect x="180" y="200" width="380" height="8" fill="#4a5760"/><rect x="180" y="310" width="380" height="8" fill="#4a5760"/>' +
        '<path d="M184 100 V330 M556 100 V330" stroke="#4a5760" stroke-width="6"/>' + boxes +
        '<text x="370" y="94" text-anchor="middle" font-family="system-ui" font-size="13" fill="' + P.dim + '">선반 C</text>' +
        '<rect x="40" y="290" width="110" height="90" fill="#3a4248" stroke="#1a1f22" stroke-width="3"/><rect x="56" y="270" width="70" height="30" fill="#59636a"/>' +
        '<rect x="610" y="270" width="140" height="22" fill="#3e3127"/><rect x="620" y="292" width="120" height="80" fill="#30261e"/><rect x="640" y="300" width="80" height="20" fill="#4a3d30"/>' +
        '<rect x="590" y="370" width="120" height="14" fill="#56646d"/><text x="650" y="400" text-anchor="middle" font-family="system-ui" font-size="11" fill="' + P.dim + '">계량대</text>' +
        '<rect x="510" y="70" width="34" height="34" rx="4" fill="#2a3238" stroke="#56646d"/>' +
        vignette(800, 450), 'art-scene');
    },
    sceneMaster: function () {
      var racks = '';
      for (var i = 0; i < 4; i++) {
        racks += '<rect x="' + (40 + i * 90) + '" y="60" width="80" height="270" fill="#1a2024" stroke="#3a4750" stroke-width="3"/>';
        for (var j = 0; j < 8; j++) racks += '<rect x="' + (48 + i * 90) + '" y="' + (72 + j * 32) + '" width="64" height="22" fill="#232b30"/><circle cx="' + (102 + i * 90) + '" cy="' + (83 + j * 32) + '" r="3" fill="' + ((i + j) % 3 ? P.green : P.amber) + '"/>';
      }
      return svg('0 0 800 450', room('#12181c') + racks +
        '<rect x="430" y="110" width="320" height="180" rx="6" fill="#0d1418" stroke="#3a4750" stroke-width="4"/>' +
        '<path d="M450 220 ' + (function () { var s = '', r = LB.util ? LB.util.rng(9) : Math.random; for (var k = 0; k < 28; k++) s += 'L' + (450 + k * 10) + ' ' + (200 + (r() - 0.5) * 60) + ' '; return s; })() + '" stroke="' + P.cyan + '" stroke-width="2" fill="none"/>' +
        '<text x="450" y="140" font-family="monospace" font-size="13" fill="' + P.cyan + '">PGM 98.7  ▶ TX ON</text>' +
        reel(520, 370, 40, true, true, P.red) + reel(640, 370, 40, false, true) +
        vignette(800, 450), 'art-scene');
    },
    sceneShutter: function () {
      var slats = '';
      for (var i = 0; i < 16; i++) slats += '<rect x="120" y="' + (40 + i * 22) + '" width="560" height="18" fill="' + (i % 2 ? '#3a4248' : '#434c52') + '"/>';
      return svg('0 0 800 450', '<rect width="800" height="450" fill="#0e1316"/>' + slats + '<rect x="100" y="30" width="600" height="14" fill="#2a3238"/>' +
        '<circle cx="740" cy="80" r="8" fill="' + P.red + '"/><circle cx="740" cy="80" r="18" fill="' + P.red + '" opacity=".35" filter="url(#lbGlow)"/>' + vignette(800, 450), 'art-scene');
    },
    sceneHall2: function () {
      return svg('0 0 800 450', room('#1a2025') + lamp(300, 200) + lamp(600, 200) +
        door(80, 140, 110, 190, '스튜디오 A') + door(260, 140, 110, 190, '부조정실') + door(440, 140, 110, 190, '편성국장실') +
        onair(85, 96, false, 0.8) + vignette(800, 450), 'art-scene');
    },
    sceneTitle: function () {
      return svg('0 0 800 600', '<rect width="800" height="600" fill="#0b0e11"/>' +
        '<radialGradient id="lbT" cx="50%" cy="35%" r="60%"><stop offset="0" stop-color="#2a2016"/><stop offset="1" stop-color="#0b0e11"/></radialGradient><rect width="800" height="600" fill="url(#lbT)"/>' +
        '<rect x="150" y="150" width="500" height="330" rx="14" fill="#1c2227" stroke="#3a4750" stroke-width="4"/>' +
        reel(285, 280, 96, true, true, P.red) + reel(515, 280, 96, false, true) +
        '<path d="M285 376 L330 420 L470 420 L515 376" stroke="#3a2a20" stroke-width="4" fill="none"/>' +
        '<rect x="330" y="410" width="140" height="22" rx="4" fill="#2a3238" stroke="#56646d"/>' +
        '<g transform="translate(220 448)">' + ['◀◀', '▶', '■', '▶▶', '●'].map(function (t, i) { return '<rect x="' + (i * 74) + '" y="0" width="64" height="20" rx="3" fill="#2f383e"/><text x="' + (i * 74 + 32) + '" y="15" text-anchor="middle" font-size="11" fill="' + (i === 4 ? P.red : '#aeb7bb') + '">' + t + '</text>'; }).join('') + '</g>' +
        onair(350, 70, true, 1) + vignette(800, 600), 'title-svg');
    }
  };

  /* ───────── 도입 사진 ───────── */
  scenes.photoLobby = function () { return scenes.sceneLobby(); };
  scenes.photoCorridor = function () {
    return svg('0 0 800 450', '<rect width="800" height="450" fill="#06090c"/>' +
      '<rect x="120" y="40" width="560" height="380" fill="#020306" stroke="#3a4750" stroke-width="6"/>' + exitSign(375, 120) +
      '<path d="M140 60 l90 0 l-120 260" stroke="#e8a63a" stroke-opacity=".12" stroke-width="12"/>' + vignette(800, 450), 'art-scene');
  };

  /* ───────── CCTV 프레임 ───────── */
  function cctvFrame(k) {
    var ir = !k.light;
    var bg = ir ? '#2c3530' : '#1d262b';
    var wall = ir ? '#39443e' : '#25313a';
    var flo = ir ? '#46524a' : '#2c383f';
    var b = '<rect width="640" height="360" fill="' + bg + '"/>' +
      '<path d="M0 0 L250 120 L390 120 L640 0Z" fill="' + wall + '"/><path d="M0 360 L250 230 L390 230 L640 360Z" fill="' + flo + '"/>' +
      '<rect x="250" y="120" width="140" height="110" fill="' + (ir ? '#4d5a52' : '#1a2227') + '"/>' +
      '<rect x="290" y="140" width="60" height="90" fill="' + (ir ? '#5f6d64' : '#2f3a41') + '"/>' +
      '<path d="M140 80 L210 108 L210 250 L140 280Z" fill="' + (ir ? '#56635a' : '#2f3a41') + '"/>' +
      '<path d="M500 80 L430 108 L430 250 L500 280Z" fill="' + (ir ? '#56635a' : '#2f3a41') + '"/>';
    var sc = k.art.scene;
    if (sc === 'minIn') b += figure(190, 140, 0.72, { gloves: true, hair: '#2a221d', color: '#5b4a4e' });
    if (sc === 'minOut') b += figure(120, 170, 0.85, { gloves: true, hair: '#2a221d', color: '#5b4a4e', box: 22 });
    if (sc === 'minLate') b += figure(185, 140, 0.72, { gloves: false, hair: '#2a221d', color: '#5b4a4e' });
    if (sc === 'figureIn') b += figure(318, 122, 0.55, { ir: true, gloves: true, coat: true });
    if (sc === 'figureDoor') b += figure(200, 136, 0.7, { ir: true, gloves: true, coat: true });
    if (sc === 'figureOut') b += figure(300, 124, 0.58, { ir: true, gloves: true, coat: true, box: 34 });
    var tint = ir ? '<rect width="640" height="360" fill="#9fd6a8" opacity=".08"/>' : '';
    var lines = '';
    for (var i = 0; i < 360; i += 4) lines += '<rect y="' + i + '" width="640" height="1" fill="#000" opacity=".18"/>';
    return '<svg class="art cctv" viewBox="0 0 640 360" aria-hidden="true" focusable="false">' + DEFS + b + tint + lines +
      '<text x="16" y="28" font-family="monospace" font-size="16" fill="#e9f5ec">CAM-1 1F 복도</text>' +
      '<text x="624" y="28" text-anchor="end" font-family="monospace" font-size="16" fill="#e9f5ec">' + (ir ? 'IR ' : '') + '● REC</text>' +
      '<text x="624" y="344" text-anchor="end" font-family="monospace" font-size="20" fill="#f4f7f2">11-30 ' + k.t + '</text></svg>';
  }

  /* ───────── 물건 ───────── */
  function objFrame(inner, label) {
    return svg('0 0 400 260', '<rect width="400" height="260" fill="#11161a"/>' + inner + (label ? '' : '') + vignette(400, 260), 'art-obj');
  }
  var objects = {
    objOnair: function () { return objFrame('<rect x="60" y="60" width="280" height="140" rx="10" fill="#1a2024"/>' + onair(150, 100, false, 1) + '<rect x="130" y="160" width="140" height="18" fill="#d8cdb3"/><text x="200" y="173" text-anchor="middle" font-size="10" font-family="system-ui" fill="#333">스튜디오 A 표시등 연동</text>'); },
    objUmbrellas: function () { return objFrame('<rect x="150" y="120" width="100" height="110" fill="#2b353c"/><path d="M170 120 l-14 -90 M200 120 l2 -100 M228 120 l18 -80" stroke="#56646d" stroke-width="6"/><path d="M196 24 q12 -14 22 0" stroke="#6fb6c6" stroke-width="4" fill="none"/><ellipse cx="200" cy="232" rx="70" ry="8" fill="#6fb6c6" opacity=".25"/>'); },
    objLogger: function (o) {
      return objFrame('<rect x="120" y="50" width="160" height="160" rx="16" fill="#2a3238" stroke="#56646d" stroke-width="4"/><rect x="140" y="74" width="120" height="50" rx="4" fill="#0f2a1c"/>' +
        '<text x="200" y="108" text-anchor="middle" font-family="monospace" font-size="22" fill="#9fe0b4">17.5° 45%</text>' +
        '<rect x="150" y="146" width="100" height="36" fill="#e9e3d6"/><text x="200" y="171" text-anchor="middle" font-family="monospace" font-weight="700" font-size="20" fill="#222">' + (o && o.label || 'HL') + '</text>');
    },
    objReel7: function () { return objFrame('<rect x="110" y="30" width="180" height="180" fill="#bcb2a0" stroke="#5a5040" stroke-width="3"/>' + reel(200, 120, 70, true, false, '#efe9da') + '<rect x="130" y="196" width="140" height="22" fill="#e9e3d6"/><text x="200" y="212" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">HD-E-990803 편집본</text>'); },
    objReel10: function () { return objFrame(reel(190, 128, 104, true, true, P.red) + '<text x="330" y="236" text-anchor="middle" font-family="monospace" font-size="13" fill="' + P.amber + '">L-990803</text><path d="M296 200 l18 22" stroke="' + P.amber + '" stroke-width="2"/>'); },
    objVault: function () {
      return objFrame('<rect x="90" y="20" width="220" height="220" fill="#3a4248" stroke="#1a1f22" stroke-width="5"/><rect x="104" y="34" width="192" height="192" fill="#1f2529"/>' +
        '<rect x="130" y="150" width="70" height="70" fill="none" stroke="' + P.amber + '" stroke-dasharray="5 4"/><text x="165" y="190" text-anchor="middle" font-size="11" font-family="system-ui" fill="' + P.amber + '">27cm</text>' +
        '<rect x="232" y="160" width="40" height="40" rx="5" fill="#2a3238" stroke="#56646d"/>' +
        '<path d="M300 24 v212" stroke="#efe4c8" stroke-width="12" opacity=".9"/><path d="M294 80 l14 4 M294 140 l14 -6" stroke="#7a3328" stroke-width="2"/><path d="M290 90 l20 0 M290 150 l20 0" stroke="#7a3328" stroke-width="1.5" opacity=".5"/>');
    },
    objShelf: function () { return objFrame('<rect x="40" y="150" width="320" height="10" fill="#4a3d30"/>' + [0, 1, 2, 4, 5, 6].map(function (i) { return '<rect x="' + (52 + i * 44) + '" y="' + (70 + (i % 2) * 6) + '" width="36" height="' + (80 - (i % 2) * 6) + '" fill="' + ['#3b4a52', '#57483a', '#2f3a35'][i % 3] + '"/>'; }).join('') + '<rect x="184" y="96" width="36" height="54" fill="none" stroke="' + P.amber + '" stroke-dasharray="4 3"/><rect x="150" y="170" width="104" height="26" fill="#e9e3d6"/><text x="202" y="188" text-anchor="middle" font-size="10" font-family="monospace" fill="#333">1999-B 편집본 7"</text>'); },
    objGloves: function () { return objFrame('<path d="M120 200 q-10 -60 6 -110 q8 -14 14 0 l4 50 l6 -70 q8 -14 14 0 l2 70 l8 -64 q8 -12 14 2 l-2 66 l10 -46 q10 -10 14 4 q-6 70 -30 98Z" fill="#ecebe6" stroke="#9a978e" stroke-width="2"/><path d="M230 210 q-10 -60 6 -110 q8 -14 14 0 l4 50 l6 -70 q8 -14 14 0 l2 70 l8 -64 q8 -12 14 2 l-2 66 l10 -46 q10 -10 14 4 q-6 70 -30 98Z" fill="#ecebe6" stroke="#9a978e" stroke-width="2"/><circle cx="136" cy="96" r="6" fill="#8a8f92" opacity=".55"/><circle cx="246" cy="106" r="6" fill="#8a8f92" opacity=".55"/>'); },
    objRadiator: function () { return objFrame('<rect x="80" y="70" width="240" height="150" fill="#4a4f52" stroke="#1a1d1f" stroke-width="4"/>' + (function () { var s = ''; for (var i = 0; i < 11; i++) s += '<rect x="' + (90 + i * 21) + '" y="78" width="13" height="134" rx="5" fill="#5d6366"/>'; return s; })() + '<path d="M60 210 h30" stroke="#6b7275" stroke-width="10"/><rect x="330" y="80" width="40" height="40" rx="4" fill="#2a3238" stroke="#56646d"/><text x="350" y="104" text-anchor="middle" font-family="monospace" font-size="10" fill="' + P.amber + '">HL-11</text>'); },
    objDoor: function () { return objFrame('<rect x="120" y="50" width="160" height="200" fill="#2b2f35" stroke="#45505a" stroke-width="6"/><rect x="140" y="70" width="120" height="160" fill="#262a30"/>' + onair(150, 8, false, 1)); },
    objConsole: function () { var s = ''; for (var i = 0; i < 8; i++) { s += '<rect x="' + (60 + i * 40) + '" y="90" width="6" height="110" fill="#111"/><rect x="' + (52 + i * 40) + '" y="' + (i === 0 ? 190 : 120 + (i * 13 % 50)) + '" width="22" height="12" fill="#cfd6d9"/>'; } return objFrame('<rect x="30" y="60" width="340" height="170" fill="#2a3036"/>' + s + '<rect x="210" y="70" width="44" height="14" rx="2" fill="' + P.green + '"/><text x="232" y="81" text-anchor="middle" font-family="monospace" font-size="9" fill="#06200f">CART07</text><text x="64" y="222" font-family="monospace" font-size="10" fill="' + P.amber + '">MIC1</text>'); },
    objKeybox: function () {
      return objFrame('<rect x="90" y="30" width="220" height="200" rx="6" fill="#2a3238" stroke="#56646d" stroke-width="4"/>' +
        [['#03', 130, '#3b464d', false], ['#05', 200, '#e9e3d6', true], ['#07', 270, '#cfa86a', true]].map(function (k) {
          return '<text x="' + k[1] + '" y="64" text-anchor="middle" font-family="monospace" font-size="14" fill="#cfd6d9">' + k[0] + '</text><circle cx="' + k[1] + '" cy="80" r="5" fill="#9aa4a9"/>' +
            '<rect x="' + (k[1] - 16) + '" y="90" width="32" height="50" rx="3" fill="' + k[2] + '"/>';
        }).join('') +
        '<text x="200" y="125" text-anchor="middle" font-family="monospace" font-size="11" fill="#222">#07</text><text x="270" y="125" text-anchor="middle" font-family="monospace" font-size="11" fill="#222">#05</text>' +
        '<path d="M180 160 q20 30 40 0" stroke="' + P.amber + '" stroke-width="2" fill="none" stroke-dasharray="4 3"/>');
    },
    objSwitch: function () {
      return objFrame('<rect x="80" y="40" width="200" height="180" fill="#2f383e" stroke="#56646d" stroke-width="4"/><path d="M280 40 L330 60 L330 230 L280 220Z" fill="#3a444b" stroke="#56646d" stroke-width="3"/>' +
        '<rect x="100" y="80" width="160" height="60" fill="#1a2024"/>' + [0, 1, 2].map(function (i) { return '<rect x="' + (116 + i * 50) + '" y="92" width="28" height="36" fill="#cfd6d9"/><rect x="' + (120 + i * 50) + '" y="' + (i === 0 ? 96 : 110) + '" width="20" height="14" fill="#6b7275"/>'; }).join('') +
        '<path d="M282 110 q14 8 6 22 q-4 8 8 10" stroke="#fff" stroke-width="2.5" fill="none"/><circle cx="296" cy="142" r="12" fill="none" stroke="' + P.amber + '" stroke-width="2"/>');
    },
    objFax: function () { return objFrame('<rect x="120" y="30" width="160" height="200" fill="#e7e2d6"/>'); },
    objSeal: function () { return objFrame('<rect x="40" y="110" width="320" height="40" fill="#efe4c8" transform="rotate(-6 200 130)"/><text x="200" y="138" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="18" fill="#7a3328" transform="rotate(-6 200 130)">윤서진 / 민해수 21:30</text><path d="M44 104 l-6 46 M356 92 l-6 46" stroke="#888" stroke-width="2" transform="rotate(-6 200 130)"/>'); },
    objPhone: function () { return objFrame('<rect x="90" y="70" width="220" height="140" rx="16" fill="#2a3238" stroke="#56646d" stroke-width="4"/><rect x="120" y="90" width="160" height="60" fill="#0f2a1c"/><text x="200" y="114" text-anchor="middle" font-family="monospace" font-size="13" fill="#9fe0b4">부재중 1</text><text x="200" y="136" text-anchor="middle" font-family="monospace" font-size="12" fill="#9fe0b4">21:47 02-6230-0714</text><circle cx="270" cy="180" r="6" fill="' + P.red + '"/>'); },
    objRoofdoor: function () { return objFrame('<rect x="110" y="20" width="180" height="210" fill="#2f383e" stroke="#56646d" stroke-width="4"/><ellipse cx="200" cy="236" rx="140" ry="14" fill="#6fb6c6" opacity=".25"/>'); },
    objUmbrella: function () { return objFrame('<path d="M200 30 L210 230" stroke="#2c2c2c" stroke-width="6"/><path d="M140 70 Q200 -10 262 76 Q230 60 206 70 Q186 56 140 70Z" fill="#26343c" stroke="#3a4a52" stroke-width="3"/><path d="M210 230 q-8 14 -20 6" stroke="#888" stroke-width="6" fill="none"/><rect x="198" y="190" width="24" height="16" fill="#e9e3d6"/><text x="210" y="203" text-anchor="middle" font-size="11" font-family="system-ui" fill="#222">한</text><path d="M180 100 l-2 10 M228 112 l2 12" stroke="#9fc3d0" stroke-width="2"/>'); },
    objBoxes: function () { var s = ''; for (var i = 0; i < 6; i++) s += '<rect x="' + (30 + (i % 3) * 120) + '" y="' + (i < 3 ? 30 : 140) + '" width="100" height="90" fill="#8a2f26" stroke="#3a120f" stroke-width="3"/><rect x="' + (60 + (i % 3) * 120) + '" y="' + (i < 3 ? 66 : 176) + '" width="40" height="18" fill="#f3e9d0"/>'; return objFrame(s); },
    objScrap: function () { return objFrame('<rect x="70" y="120" width="260" height="120" fill="#3a4248" stroke="#1a1f22" stroke-width="3"/><rect x="130" y="40" width="140" height="100" fill="#8d9296" stroke="#4a4f52" stroke-width="3"/><rect x="200" y="46" width="64" height="16" fill="#e9e3d6"/><text x="232" y="58" text-anchor="middle" font-family="monospace" font-size="8" fill="#333">HD-L-990803</text>' + reel(200, 100, 34, false, true) + '<rect x="214" y="104" width="34" height="14" fill="#f3e9d0" transform="rotate(14 230 110)"/><text x="231" y="115" text-anchor="middle" font-family="monospace" font-size="7" fill="#7a3328" transform="rotate(14 230 110)">S-4474</text>'); },
    objCamera: function () { return objFrame('<rect x="110" y="80" width="180" height="80" rx="10" fill="#2a3238" stroke="#56646d" stroke-width="3"/><circle cx="250" cy="120" r="30" fill="#0b0e11" stroke="#56646d" stroke-width="3"/><circle cx="250" cy="120" r="12" fill="#1a2a3a"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<circle cx="' + (250 + Math.cos(i * 0.785) * 22) + '" cy="' + (120 + Math.sin(i * 0.785) * 22) + '" r="3" fill="#5a1f1a"/>'; }).join('') + '<path d="M150 160 v50 h-30" stroke="#56646d" stroke-width="6" fill="none"/>'); },
    objStair: function () { return objFrame('<path d="M40 240 L120 240 L120 200 L200 200 L200 160 L280 160 L280 120 L360 120 L360 260 L40 260Z" fill="#232b30" stroke="#3a4750" stroke-width="3"/><text x="320" y="110" font-family="system-ui" font-size="12" fill="' + P.dim + '">2F</text><text x="160" y="190" font-family="system-ui" font-size="12" fill="' + P.dim + '">1F</text><text x="60" y="232" font-family="system-ui" font-size="12" fill="' + P.dim + '">B1</text>'); }
  };

  /* ───────── 인물 ───────── */
  var portraits = {
    yoon: { hair: '#1c1715', coat: '#4a3b40', acc: '<path d="M-30 64 Q0 84 30 64 L26 76 Q0 92 -26 76Z" fill="#8a4a3a"/>', hairPath: 'M-34 16 Q-34 -32 0 -32 Q34 -32 34 16 L34 40 L22 40 L22 4 Q0 -10 -22 4 L-22 40 L-34 40Z' },
    han: { hair: '#232220', coat: '#33403f', acc: '<path d="M-31 6 C-31 -42 31 -42 31 6" stroke="#111" stroke-width="6" fill="none"/><rect x="-37" y="-2" width="12" height="22" rx="5" fill="#161616"/><rect x="25" y="-2" width="12" height="22" rx="5" fill="#161616"/>', hairPath: 'M-28 -6 Q-26 -32 0 -32 Q26 -32 28 -6 Q14 -16 0 -16 Q-14 -16 -28 -6Z', drip: true },
    min: { hair: '#3a2e28', coat: '#5b4a4e', acc: '<rect x="-24" y="2" width="20" height="14" rx="4" fill="none" stroke="#ddd" stroke-width="2.5"/><rect x="4" y="2" width="20" height="14" rx="4" fill="none" stroke="#ddd" stroke-width="2.5"/><path d="M-4 9 h8" stroke="#ddd" stroke-width="2"/>', hairPath: 'M-30 10 Q-32 -30 0 -32 Q32 -30 30 10 Q30 -10 18 -14 Q4 -2 -20 -10 Q-28 -4 -30 10Z M18 -24 a12 12 0 1 1 0.1 0Z' },
    seoha: { hair: '#14110f', coat: '#3d3a33', acc: '<rect x="-20" y="80" width="40" height="26" rx="4" fill="#111"/><circle cx="0" cy="93" r="8" fill="#2a3a48"/>', hairPath: 'M-30 20 Q-34 -32 0 -32 Q34 -32 30 20 L30 60 Q20 30 22 0 Q0 -14 -22 0 Q-20 30 -30 60Z' },
    ian: { hair: '#1e1b18', coat: '#2c3d46', acc: '<path d="M-24 46 Q0 62 24 46" stroke="#6fb6c6" stroke-width="5" fill="none"/><rect x="-30" y="38" width="11" height="15" rx="4" fill="#24353d" stroke="#6fb6c6" stroke-width="2"/><rect x="19" y="38" width="11" height="15" rx="4" fill="#24353d" stroke="#6fb6c6" stroke-width="2"/>', hairPath: 'M-28 -4 Q-30 -34 2 -32 Q30 -30 28 -4 Q20 -22 4 -20 Q-12 -26 -28 -4Z' }
  };
  function portrait(who, size) {
    var p = portraits[who]; if (!p) return '';
    var s = '<svg class="portrait" viewBox="-60 -50 120 140" width="' + (size || 64) + '" height="' + (size || 64) * 1.16 + '" aria-hidden="true" focusable="false">' +
      '<rect x="-60" y="-50" width="120" height="140" fill="#161c20"/>' +
      '<path d="M-52 90 Q-50 50 -20 44 L20 44 Q50 50 52 90Z" fill="' + p.coat + '"/>' +
      '<rect x="-9" y="28" width="18" height="18" fill="#7d6a5c"/>' +
      '<ellipse cx="0" cy="8" rx="26" ry="31" fill="#8f7a69"/>' +
      '<path d="' + p.hairPath + '" fill="' + p.hair + '"/>' + p.acc +
      (p.drip ? '<path d="M24 -2 q2 6 0 8 q-2 -2 0 -8Z M-22 0 q2 6 0 8 q-2 -2 0 -8Z" fill="#9fc3d0"/>' : '') +
      '</svg>';
    return s;
  }

  /* ───────── 파형 ───────── */
  /* 녹음 id에 대한 진폭 배열 (초당 4샘플). t2와 onair의 목소리 구간은 같은 시드로 같은 모양을 만든다. */
  var waveCache = {};
  function waveform(recId) {
    if (waveCache[recId]) return waveCache[recId];
    var C = LB.CASE, rec = C.recordings[recId], E = LB.engine;
    var n = Math.ceil(rec.dur * 4), out = new Array(n);
    var voiceSeed = rec.seed, base = recId === 'onair' ? 30 : 0;
    var voiceAmp = function (t, seed) {
      var r = LB.util.rng(seed * 100003 + Math.floor(t * 4));
      var syll = 0.35 + 0.45 * Math.abs(Math.sin(t * 5.3 + seed)) * (0.6 + 0.4 * r());
      var phrase = Math.sin(t * 0.7 + seed) > -0.85 ? 1 : 0.15;
      return syll * phrase;
    };
    for (var i = 0; i < n; i++) {
      var t = i / 4, v = 0.03;
      rec.segments.forEach(function (sg) {
        if (t >= sg[0] && t < sg[1]) {
          if (sg[2] === 'music') v = 0.42 + 0.18 * Math.sin(t * 2.1) + 0.1 * Math.sin(t * 7.7);
          else v = voiceAmp(t - (recId === 'onair' ? base : 0), voiceSeed);
        }
      });
      if (recId === 'onair' && (t < 30 || t >= 330)) v *= (t < 30 ? Math.max(0.15, 1 - t / 34) : Math.min(1, (t - 330) / 8));
      out[i] = Math.min(1, v);
    }
    E.recMarkers(recId).forEach(function (m) {
      var idx = Math.round(m[0] * 4);
      var w = m[1] === 'coughfit' ? 40 : 2;
      for (var k = 0; k < w && idx + k < n; k++) out[idx + k] = m[1] === 'clank' ? 0.98 : (m[1] === 'page' ? 0.55 : 0.9);
    });
    waveCache[recId] = out;
    return out;
  }

  LB.art = {
    scene: function (key) { return (scenes[key] || scenes.sceneLobby)(); },
    object: function (key, opt) { return (objects[key] || objects.objFax)(opt); },
    cctv: cctvFrame,
    portrait: portrait,
    waveform: waveform,
    reel: function (full) { return svg('0 0 200 200', reel(100, 100, 80, full, true, full ? P.red : null)); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
