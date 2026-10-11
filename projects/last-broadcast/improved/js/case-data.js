/*
 * 마지막 송출 — 사건 데이터
 * 이 파일에는 이야기·증거·퍼즐 정답·힌트만 둔다. 상태 전이와 채점 규칙은 engine.js에 있다.
 * 시각 표기: 'std' = 표준시(건물 관리·송출 장비·외부 기관), 'dvr' = 복도 CCTV 녹화기 표시(7분 빠름).
 */
(function (root) {
  'use strict';
  var LB = (root.LB = root.LB || {});

  LB.CASE = {
    id: 'last-broadcast',
    title: '마지막 송출',
    dataVersion: 2,
    estimate: '30~40분 (예상치 · 사람 플레이테스트 전)',

    station: {
      name: '해담FM 98.7',
      blurb: '1992년에 문을 연 지역 라디오. 오늘 자정 송신을 끝으로 폐국한다.',
      past: '1999년 8월 3일 새벽, 상곡저수지 긴급 방류. 은하천 하류 야영장에서 두 사람이 숨졌다. 해담FM이 방류 경보를 언제 내보냈는지는 27년 동안 공식 기록으로만 남아 있었다.'
    },

    people: {
      seoha: { name: '서하', role: '현장 기자', short: '서하', color: 'seoha',
        bio: '폐국 마지막 밤을 취재하러 왔다. 1999년 은하천 경보 지연 의혹을 3년째 쫓고 있다.' },
      ian: { name: '이안', role: '송출실 기술자', short: '이안', color: 'ian',
        bio: '해담FM의 마지막 신입. 오늘 자정에 송신기를 끄는 것이 마지막 업무다.' },
      yoon: { name: '윤서진', role: '편성국장 · 58', short: '윤서진',
        bio: '1992년 입사. 1999년 당시 야간 PD였다. 오늘 밤 마지막 인사 방송을 맡았다.' },
      han: { name: '한도윤', role: '음향기사 · 49', short: '한도윤',
        bio: '1999년 그날 밤 콘솔을 맡았던 신입 엔지니어. 말수가 적다.' },
      min: { name: '민해수', role: '기록 담당 · 53', short: '민해수',
        bio: '자료실과 금고를 30년째 관리한다. 1999년 사고 경위 조사 때 녹음 정리를 맡았다.' }
    },

    roles: {
      seoha: { label: '서하 · 현장', desk: '현장 조사', hint: '방송국 공간, 사람의 진술, 종이 자료와 사진을 조사합니다.' },
      ian: { label: '이안 · 송출실', desk: '송출실 기록', hint: '건물 관리 기록, 센서, 송출 음원과 장비 로그를 분석합니다.' }
    },

    acts: [
      { id: 1, title: '21시 47분', sub: '사라진 원본',
        goal: '금고가 언제, 어떤 카드로 열렸는지 확정하고 그 시각 금고 앞에 있을 수 없었던 사람을 가린다.' },
      { id: 2, title: '목소리의 빈자리', sub: '방송은 정말 생방송이었나',
        goal: '민해수가 가져간 것을 확인하고, 21:45 방송이 어디에서 나왔는지 밝힌다.' },
      { id: 3, title: '마지막 송출', sub: '원본을 찾아서',
        goal: '남은 알리바이를 검증하고 원본을 찾아 대조한 뒤 최종 보고서를 쓴다.' }
    ],

    objectives: {
      1: [
        { id: 'J1', label: '복도 CCTV 시계를 표준시에 맞춘다', done: { joint: 'J1' },
          guide: { seoha: '경비실 CCTV에서 눈에 띄는 변화가 찍힌 장면의 표시 시각을 이안에게 알려 주세요.',
                   ian: '건물 관리 기록에서 같은 사건을 찾아 [영상 시각 보정]에 입력하세요.' } },
        { id: 'J2', label: '금고가 열린 순간을 기록계로 확인한다', done: { joint: 'J2' },
          guide: { seoha: '자료실과 금고 안을 살펴 기록계 번호를 이안에게 알려 주세요.',
                   ian: '센서 기록계 화면에서 금고 안 기록계를 지정하세요. 번호는 서하가 알고 있습니다.' } },
        { id: 'IC1', label: '공동 결론 1 · 금고가 열린 시각', done: { concl: 'IC1' },
          guide: { seoha: '사건 보드에서 함께 결론을 제출하세요.', ian: '사건 보드에서 함께 결론을 제출하세요.' } }
      ],
      2: [
        { id: 'MIN', label: '민해수가 자료실에서 가져간 것을 확인한다', done: { found: 's_editcopy' },
          guide: { seoha: '민해수에게 영상 속 출입을 물어보세요.', ian: '이 일은 서하의 현장 조사입니다.' } },
        { id: 'J3', label: '21:45 방송 속 금속음의 출처를 밝힌다', done: { joint: 'J3' },
          guide: { seoha: '스튜디오 A와 사람들의 말에서 그 소리가 어디서 나는지 찾아 이안에게 전하세요.',
                   ian: '음원 작업대에서 송출 녹음을 듣고, 말소리가 아닌 소리를 서하에게 설명하세요.' } },
        { id: 'MATCH', label: '21:45 방송과 같은 음원 파일을 찾는다', done: { joint: 'MATCH' },
          guide: { seoha: '이 일은 이안의 음원 작업대에서 합니다.', ian: '음원 비교에서 두 파형을 겹쳐 보세요.' } },
        { id: 'IC2', label: '공동 결론 2 · 21:45 방송의 정체', done: { concl: 'IC2' },
          guide: { seoha: '사건 보드에서 함께 결론을 제출하세요.', ian: '사건 보드에서 함께 결론을 제출하세요.' } }
      ],
      3: [
        { id: 'J4', label: '한도윤이 자리를 비운 5분을 검증한다', done: { joint: 'J4' },
          guide: { seoha: '한도윤에게 그 시간에 어디 있었는지 다시 물어보세요. 흔적이 있으면 보여 주세요.',
                   ian: '감사팀 회신을 확인하고 [제보 전화 대조]를 진행하세요.' } },
        { id: 'J5', label: '원본이 숨겨진 상자를 찾는다', done: { joint: 'J5' },
          guide: { seoha: '이안이 지하 출입을 풀어 주면 선반 C를 조사하세요. 업체 목록은 이안에게 있습니다.',
                   ian: '건물 관리 기록에서 지하 반출대기실 잠금을 해제하고, 업체 반출 목록을 서하에게 읽어 주세요.' } },
        { id: 'J6', label: '찾은 릴이 원본인지 대조한다', done: { joint: 'J6' },
          guide: { seoha: '릴의 규격과 리더 끝 표식을 이안에게 정확히 알려 주세요.',
                   ian: '수신함·대장에서 [원본 대조]를 진행하세요.' } },
        { id: 'FINAL', label: '최종 수사 보고서를 제출한다', done: { concl: 'FINAL' },
          guide: { seoha: '사건 보드에서 함께 보고서를 작성하세요.', ian: '사건 보드에서 함께 보고서를 작성하세요.' } }
      ]
    },

    /* ───────── 서하: 평면도 ───────── */
    floors: [
      { id: 'roof', label: '옥상', cols: 4, rows: 1, cells: [
        { loc: 'roof', c: 1, r: 1, w: 2, h: 1 },
        { label: '송신탑', c: 3, r: 1, w: 2, h: 1, kind: 'outside' } ] },
      { id: '2F', label: '2층', cols: 4, rows: 2, cells: [
        { loc: 'studio', c: 1, r: 1, w: 1, h: 1 },
        { loc: 'sub', c: 2, r: 1, w: 1, h: 1 },
        { loc: 'office', c: 3, r: 1, w: 1, h: 1 },
        { loc: 'east2', c: 4, r: 1, w: 1, h: 2 },
        { label: '서측 계단 · 옥상↑', c: 1, r: 2, w: 1, h: 1, kind: 'stair' },
        { label: '2층 복도', c: 2, r: 2, w: 2, h: 1, kind: 'hall' } ] },
      { id: '1F', label: '1층', cols: 4, rows: 3, cells: [
        { loc: 'records', c: 1, r: 1, w: 1, h: 1 },
        { loc: 'archive', c: 2, r: 1, w: 1, h: 1 },
        { label: '송출실 · 이안', c: 3, r: 1, w: 1, h: 1, kind: 'partner' },
        { label: '동측 계단', c: 4, r: 1, w: 1, h: 3, kind: 'stair' },
        { loc: 'lobby', c: 1, r: 2, w: 1, h: 2 },
        { loc: 'hall', c: 2, r: 2, w: 2, h: 1 },
        { loc: 'guard', c: 2, r: 3, w: 1, h: 1 },
        { label: '화장실', c: 3, r: 3, w: 1, h: 1, kind: 'misc' } ] },
      { id: 'B1', label: '지하 1층', cols: 4, rows: 1, cells: [
        { loc: 'staging', c: 1, r: 1, w: 2, h: 1 },
        { label: '하역장 · 셔터', c: 3, r: 1, w: 1, h: 1, kind: 'misc' },
        { label: '동측 계단', c: 4, r: 1, w: 1, h: 1, kind: 'stair' } ] }
    ],

    locations: {
      lobby: { name: '로비', floor: '1F', art: 'sceneLobby',
        desc: '정문과 복도 유리문 사이. 천장 스피커에서 방송이 흘러나온다.',
        hotspots: [
          { id: 'h_lobby_onair', label: 'ON AIR 중계등', x: 72, y: 20, grants: ['s_onair_lobby'],
            line: '스튜디오 표시등을 그대로 따라 켜지는 중계등이다. 지금은 꺼져 있다.' },
          { id: 'h_lobby_notice', label: '게시판 공지', x: 22, y: 42, grants: ['s_notice'],
            line: '폐국 절차가 시간순으로 적혀 있다.' },
          { id: 'h_lobby_umbrella', label: '우산꽂이', x: 12, y: 78, grants: ['s_umbrellas'],
            line: '젖은 우산은 내 것 하나뿐이다.' },
          { id: 'h_lobby_glass', label: '복도 유리문', x: 88, y: 58, line: '유리문 너머로 복도가 길게 뻗어 있다. 끝에 동측 계단 문이 보인다.' }
        ] },
      records: { name: '접수실 · 기록실', floor: '1F', art: 'sceneRecords',
        desc: '민해수의 자리. 택배 접수 창구는 건물 바깥쪽으로 나 있다.',
        hotspots: [
          { id: 'h_rec_receipt', label: '택배 단말기 영수증', x: 22, y: 34, grants: ['s_receipt'],
            line: '접수 창구에 오늘 마지막 택배 영수증이 꽂혀 있다.' },
          { id: 'h_rec_print', label: '프린터 출력물', x: 72, y: 30, grants: ['s_ccprint'],
            line: '감사팀 문서의 참조본이다. 출력 시각이 찍혀 있다.' },
          { id: 'h_rec_logger', label: '벽면 기록계', x: 90, y: 22, grants: ['s_logger_records'],
            line: '자료 보존용 온습도 기록계. 번호 스티커가 붙어 있다.' },
          { id: 'h_rec_drawer', label: '책상 서랍', x: 50, y: 70, unlock: { asked: 't_min_box' },
            lockedHint: '민해수의 개인 서랍이다. 허락 없이 열 수는 없다.',
            grants: ['s_editcopy', 's_editnote', 's_1999memo'],
            line: '민해수가 말한 대로 서랍 맨 아래 칸에 작은 릴 상자가 있다.' }
        ] },
      guard: { name: '경비실', floor: '1F', art: 'sceneGuard',
        desc: '야간 경비 계약은 오늘 18시에 끝났다. 녹화기만 돌아간다.',
        hotspots: [
          { id: 'h_guard_dvr', label: 'CCTV 녹화기', x: 40, y: 40, grants: ['s_cctv'], action: 'cctv',
            line: '복도 카메라 한 대의 녹화본을 돌려 볼 수 있다.' },
          { id: 'h_guard_log', label: '경비 근무일지', x: 78, y: 62, grants: ['s_guardlog'],
            line: '마지막 근무자의 글씨가 남아 있다.' }
        ] },
      hall: { name: '1층 복도', floor: '1F', art: 'sceneHall',
        desc: '로비 유리문에서 동측 계단까지 이어지는 복도. 자료실과 송출실 문이 있다.',
        hotspots: [
          { id: 'h_hall_camera', label: '복도 카메라', x: 12, y: 14, grants: ['s_camera'],
            line: '로비 쪽 천장에서 동쪽을 내려다보는 카메라.' },
          { id: 'h_hall_east', label: '동측 계단 문', x: 86, y: 50, grants: ['s_eaststair'],
            line: '계단은 지하 1층부터 2층까지 이어진다.' },
          { id: 'h_hall_archive', label: '자료실 문', x: 46, y: 46, line: '카드 리더기가 달린 철문. 복도 쪽 말고 다른 출입구는 없다.' }
        ] },
      archive: { name: '자료실', floor: '1F', art: 'sceneArchive',
        desc: '열린 선반과 다이얼 금고. 오래된 테이프 냄새가 난다.',
        hotspots: [
          { id: 'h_arc_vault', label: '금고', x: 30, y: 52, grants: ['s_vault'],
            line: '봉인 테이프가 붙어 있지만 무언가 어긋나 있다.' },
          { id: 'h_arc_vlogger', label: '금고 안 기록계', x: 30, y: 76, grants: ['s_logger_vault'],
            line: '금고 안쪽 벽에 손바닥만 한 기록계가 붙어 있다.' },
          { id: 'h_arc_wlogger', label: '벽면 기록계', x: 8, y: 26, grants: ['s_logger_archive'],
            line: '자료실 벽에도 같은 기록계가 있다.' },
          { id: 'h_arc_shelf', label: '열린 선반 1999-B', x: 70, y: 40, grants: ['s_shelf'],
            line: '1999년 자료 칸 하나가 비어 있다.' },
          { id: 'h_arc_gloves', label: '면장갑 상자', x: 88, y: 74, grants: ['s_gloves'],
            line: '테이프를 만질 때 쓰는 흰 면장갑.' },
          { id: 'h_arc_proc', label: '봉인 절차서', x: 52, y: 22, unlock: { asked: 't_min_dial' },
            lockedHint: '선반 위 바인더들. 지금은 무엇을 찾아야 할지 모르겠다.',
            grants: ['s_procedure'], line: '민해수가 가리킨 바인더. 폐국 봉인 절차가 정리되어 있다.' }
        ] },
      studio: { name: '스튜디오 A', floor: '2F', art: 'sceneStudio',
        desc: '창 없는 방음실. 마지막 인사가 나간 곳으로 되어 있다.',
        hotspots: [
          { id: 'h_st_radiator', label: '라디에이터', x: 14, y: 68, grants: ['s_radiator'],
            line: '주철 라디에이터. 손을 대 보니 차갑다.' },
          { id: 'h_st_script', label: '원고대', x: 56, y: 56, grants: ['s_script'],
            line: '마지막 인사 원고가 그대로 놓여 있다.' },
          { id: 'h_st_door', label: '방음문', x: 90, y: 50, grants: ['s_soundproof'],
            line: '두꺼운 이중문. 닫으면 바깥 소리가 전혀 들리지 않는다.' },
          { id: 'h_st_mic', label: '마이크', x: 52, y: 30, line: '마이크 암이 벽 쪽으로 접혀 있다. 이것만으로는 언제 접었는지 알 수 없다.' }
        ] },
      sub: { name: '부조정실', floor: '2F', art: 'sceneSub',
        desc: '스튜디오 A를 유리창 너머로 보는 조정실.',
        hotspots: [
          { id: 'h_sub_console', label: '콘솔', x: 46, y: 62, grants: ['s_console'],
            line: '페이더와 버튼의 지금 상태를 확인했다.' },
          { id: 'h_sub_cue', label: '큐시트', x: 76, y: 70, grants: ['s_cuesheet'],
            line: '오늘 저녁 일정이 적힌 큐시트.' },
          { id: 'h_sub_keys', label: '키 보관함', x: 90, y: 30, grants: ['s_keybox'],
            line: '벽에 붙은 작은 키 보관함. 잠겨 있지 않다.' }
        ] },
      office: { name: '편성국장실', floor: '2F', art: 'sceneOffice', unlock: { concl: 'IC2' },
        lockedHint: '윤서진의 방. 지금은 잠겨 있다.',
        desc: '동측 계단 바로 옆 방. 윤서진이 열어 두었다.',
        hotspots: [
          { id: 'h_off_fax', label: '팩스', x: 80, y: 40, grants: ['s_fax'],
            line: '수신된 팩스 한 장이 트레이에 남아 있다.' },
          { id: 'h_off_trash', label: '휴지통', x: 18, y: 78, grants: ['s_cutseal'],
            line: '구겨진 종이 사이에 반짝이는 테이프 조각이 있다.' },
          { id: 'h_off_phone', label: '책상 전화', x: 50, y: 52, grants: ['s_deskphone'],
            line: '전화기 화면에 부재중 표시가 떠 있다.' },
          { id: 'h_off_coat', label: '코트 걸이', x: 92, y: 64, grants: ['s_coatgloves'],
            line: '걸린 코트 주머니가 불룩하다.' }
        ] },
      east2: { name: '2층 동측 계단참', floor: '2F', art: 'sceneEast2',
        desc: '편성국장실 문 바로 옆 계단참. 벽에 조명 스위치반이 있다.',
        hotspots: [
          { id: 'h_e2_switch', label: '조명 스위치반', x: 40, y: 40, grants: ['s_switch'],
            line: '야간 순찰용 일괄 스위치반. 문이 살짝 열려 있다.' },
          { id: 'h_e2_down', label: '아래층 계단', x: 78, y: 70, line: '1층 복도와 지하 반출대기실로 바로 이어진다.' }
        ] },
      roof: { name: '옥상 출입구', floor: 'roof', art: 'sceneRoof',
        desc: '서측 계단 끝. 옥상으로 나가는 철문.',
        hotspots: [
          { id: 'h_roof_door', label: '철문 안쪽', x: 30, y: 60, grants: ['s_roofdoor'],
            line: '문 안쪽 바닥에 빗물이 고여 있다.' },
          { id: 'h_roof_umbrella', label: '세워 둔 우산', x: 64, y: 66, grants: ['s_umbrella'],
            line: '젖은 장우산 하나가 벽에 기대어 있다.' },
          { id: 'h_roof_tower', label: '송신탑', x: 84, y: 22, line: '빗속에서 송신탑 경고등이 깜빡인다. 자정이면 저것도 꺼진다.' }
        ] },
      staging: { name: '반출 대기실', floor: 'B1', art: 'sceneStaging', unlock: { flag: 'b1Unlocked' },
        lockedHint: '22:00 출입 통제와 함께 잠겼다. 송출실에서 해제할 수 있다.',
        desc: '폐기 업체가 수거해 갈 상자들이 선반에 쌓여 있다.',
        hotspots: [
          { id: 'h_stg_shelfc', label: '선반 C', x: 42, y: 46, action: 'shelf', grants: ['s_boxes'],
            line: '빨간 운송 상자 여섯 개. 상자마다 업체 봉인 스티커가 붙어 있다.' },
          { id: 'h_stg_ledger', label: '반출 대장 서랍', x: 82, y: 64, grants: ['s_ledger'],
            line: '업체가 두고 간 대장과 예비 봉인 묶음.' },
          { id: 'h_stg_scrap', label: '고철 수거함', x: 12, y: 72, grants: ['s_scrap'],
            line: '금속 폐기물을 모으는 통. 맨 위에 회색 상자가 있다.' },
          { id: 'h_stg_logger', label: '기둥 기록계', x: 66, y: 18, grants: ['s_logger_b1'],
            line: '여기에도 기록계가 있다.' }
        ] }
    },

    /* ───────── 이안: 송출실 장비 ───────── */
    stations: {
      bms: { title: '건물 관리 기록', icon: 'panel',
        tabs: [
          { id: 'light', label: '조명', ev: 'i_bms_light' },
          { id: 'access', label: '출입', ev: 'i_bms_access' },
          { id: 'doors', label: '문 센서', ev: 'i_bms_doors' },
          { id: 'env', label: '난방·환경', ev: 'i_bms_env' },
          { id: 'cards', label: '카드 대장', ev: 'i_cardreg' }
        ],
        actions: [
          { id: 'unlockB1', label: '지하 반출대기실 출입 잠금 해제', unlock: { concl: 'IC2' }, flag: 'b1Unlocked',
            confirm: '22:00 출입 통제로 잠긴 지하 반출대기실 문을 엽니다. 서하가 들어가 조사할 수 있게 됩니다.',
            done: '지하 반출대기실 출입 잠금을 해제했다. 서하에게 알려 주세요.' }
        ] },
      sensors: { title: '센서 기록계', icon: 'graph', ev: 'i_loggers' },
      audio: { title: '음원 작업대', icon: 'wave' },
      docs: { title: '수신함 · 대장', icon: 'inbox',
        items: [
          { ev: 'i_tapereg' },
          { ev: 'i_manifest' },
          { ev: 'i_chanlog', unlock: { concl: 'IC1' } },
          { ev: 'i_cartlog', unlock: { concl: 'IC1' } },
          { ev: 'i_manual', unlock: { concl: 'IC1' } },
          { ev: 'i_audit', unlock: { concl: 'IC2' } }
        ] }
    },

    /* 복도 CCTV 키프레임 — t는 녹화기 표시 시각(dvr) */
    cctv: [
      { t: '21:46:30', light: true, art: { scene: 'empty' },
        text: '복도 조명 켜짐. 아무도 없다. 송출실 문과 자료실 문은 닫혀 있다.' },
      { t: '21:48:20', light: true, art: { scene: 'minIn' },
        text: '민해수가 자료실 문에 카드를 댄다. 흰 장갑을 끼고 있고 손에 든 것은 없다.' },
      { t: '21:50:50', light: true, art: { scene: 'minOut' },
        text: '민해수가 자료실에서 나와 로비 쪽(서쪽)으로 걸어간다. 가슴께에 작은 정사각 상자를 안고 있다. 상자 폭은 어깨너비의 절반이 안 된다.' },
      { t: '21:54:05', light: false, art: { scene: 'dark' },
        text: '복도 조명이 꺼진다. 화면이 적외선 흑백으로 바뀐다.' },
      { t: '21:54:20', light: false, art: { scene: 'figureIn' },
        text: '동측 계단 문이 열리고 누군가 들어온다. 흰 장갑이 하얗게 빛난다. 얼굴은 어둡고, 무릎까지 오는 외투를 입었다.' },
      { t: '21:54:30', light: false, art: { scene: 'figureDoor' },
        text: '그 사람이 자료실 문 앞에서 카드를 대는 동작을 한다.' },
      { t: '21:55:30', light: false, art: { scene: 'figureOut' },
        text: '자료실에서 나와 동측 계단 쪽으로 돌아간다. 두 손으로 납작한 정사각 상자를 들었다. 상자 폭이 어깨너비의 절반쯤 된다.' },
      { t: '21:56:10', light: true, art: { scene: 'empty' },
        text: '조명이 다시 켜진다. 복도는 비어 있다.' },
      { t: '22:11:10', light: true, art: { scene: 'minLate' },
        text: '민해수가 서둘러 자료실로 들어간다. (금고를 확인하러 간 시각)' }
    ],
    cctvNote: '녹화기 표시 시각. 송출실 문은 이 구간 동안 한 번도 열리지 않는다.',

    /* 센서 기록계 — 위치는 이안 쪽 대장에 없다(서하가 현장에서 확인) */
    loggers: {
      window: ['19:30', '22:10'],
      list: [
        { id: 'HL-11', base: { t: 22.0, h: 38 }, drop: { at: '20:00', to: 17.0, mins: 40 }, events: [] },
        { id: 'HL-14', base: { t: 20.0, h: 35 }, events: [], note: '송출실 (이안 자리)' },
        { id: 'HL-17', base: { t: 18.0, h: 41 }, events: [
          { at: '21:30:05', h: 2.0, t: 0.4, decay: 6 }, { at: '21:41:20', h: 1.6, t: 0.3, decay: 5 },
          { at: '21:47:30', h: 1.8, t: 0.3, decay: 5 }, { at: '22:04:10', h: 1.8, t: 0.3, decay: 5 } ] },
        { id: 'HL-22', base: { t: 17.5, h: 45 }, events: [
          { at: '21:30:10', h: 5.0, t: 0.6, decay: 14 }, { at: '21:47:50', h: 6.0, t: 0.7, decay: 14 },
          { at: '22:04:30', h: 5.5, t: 0.6, decay: 14 } ] },
        { id: 'HL-25', base: { t: 19.5, h: 37 }, events: [ { at: '21:44:00', h: 0.6, t: 0.1, decay: 3 } ] },
        { id: 'HL-30', base: { t: 15.0, h: 52 }, events: [
          { at: '17:25:00', h: 3.0, t: 0.8, decay: 10 }, { at: '20:09:50', h: 2.5, t: 0.6, decay: 10 },
          { at: '21:50:40', h: 2.8, t: 0.7, decay: 10 } ] }
      ],
      note: '폐국 전 재배치 이후 설치 위치 대장이 갱신되지 않았다. 위치가 확실한 것은 송출실의 HL-14뿐이다.'
    },

    /* 음원 — sec는 파일 시작 기준 초 */
    recordings: {
      onair: { id: 'onair', file: 'LOG_2144_2150.wav', label: '송출 감시 녹음 21:44:30~21:50:30', dur: 360, start: '21:44:30',
        seed: 7, segments: [[0, 30, 'music'], [30, 330, 'voice'], [330, 360, 'music']] },
      t1: { id: 't1', file: 'REC_1800_T1.wav', label: '스튜디오 A 녹음 18:00 · Take 1', dur: 130, seed: 23,
        segments: [[0, 130, 'voice']] },
      t2: { id: 't2', file: 'REC_1800_T2.wav', label: '스튜디오 A 녹음 18:00 · Take 2', dur: 300, seed: 7, seedOffset: 30,
        segments: [[0, 300, 'voice']] },
      backup: { id: 'backup', file: 'BACKUP_FAREWELL.mp3', label: '비상용 대체 음원 (음악)', dur: 180, seed: 41,
        segments: [[0, 180, 'music']] }
    },
    /* 마커와 원고: 녹음의 내용. onair는 t2를 30초 뒤에 놓은 것 */
    takeScript: {
      t2: [
        [0, '해담FM 98.7, 윤서진입니다.'],
        [6, '오늘 자정, 해담FM은 마지막 송출을 합니다.'],
        [14, '서른네 해 동안 이 주파수로 여러분의 밤을 지켜 왔습니다.'],
        [22, '지금 시각, 아홉 시 사십오 분.'],
        [34, '…실례했습니다.'],
        [40, '제가 이 방송국에 처음 왔을 때, 저는 야간 PD였습니다.'],
        [56, '새벽 세 시에도 누군가는 라디오를 켜 둔다는 걸 그때 배웠죠.'],
        [72, '신호가 약하다고 전화 주신 분들, 사연을 보내 주신 분들.'],
        [86, '모두 고맙습니다.'],
        [118, '오늘 마지막 곡은 여러분이 가장 많이 신청해 주신 노래입니다.'],
        [150, '자정까지 남은 두 시간, 이 노래들과 함께하겠습니다.'],
        [200, '해담FM에서 일한 모든 사람을 대신해 인사드립니다.'],
        [262, '좋은 밤 되세요.'],
        [280, '고맙습니다. 해담FM이었습니다.']
      ],
      t1: [
        [0, '해담FM 98.7, 윤서진입니다.'],
        [6, '오늘 자정, 해담FM은 마지막 송출을 합니다.'],
        [14, '서른네 해 동안 이 주파수로 여러분의 밤을 지켜 왔습니다.'],
        [22, '지금 시각, 아홉 시 사십오 분.'],
        [40, '제가 이 방송국에 처음 왔을 때, 저는 야간 PD였습니다.'],
        [82, '…잠깐만요. 죄송해요. 다시 갈게요.']
      ]
    },
    markers: {
      t2: [
        [12, 'clank'], [31, 'cough'], [31.6, 'cough'], [53, 'clank'], [94, 'clank'], [112, 'page'],
        [135, 'clank'], [176, 'clank'], [217, 'clank'], [258, 'clank']
      ],
      t1: [
        [5, 'clank'], [46, 'clank'], [70, 'coughfit'], [87, 'clank'], [128, 'clank']
      ],
      backup: []
    },
    markerLabels: {
      clank: '규칙적인 금속음 “딱”', cough: '기침', coughfit: '심한 기침이 이어짐', page: '종이 넘기는 소리', music: '음악'
    },
    audioNote: '소리를 켜지 않아도 파형의 표시와 아래 원고로 같은 정보를 확인할 수 있다.',

    /* 지하 선반 C — 현장(서하)에서 보이는 값 */
    boxes: [
      { id: 'C-1', seal: 'S-4471', weight: 0.9, contents: '빈 10.5인치 금속 릴 1개' },
      { id: 'C-2', seal: 'S-4472', weight: 2.4, contents: '오래된 7인치 녹음 테이프 4개' },
      { id: 'C-3', seal: 'S-4473', weight: 0.9, contents: '빈 10.5인치 금속 릴 1개' },
      { id: 'C-4', seal: 'S-4478', weight: 1.7, contents: '테이프가 감긴 10.5인치 금속 릴 1개', target: true },
      { id: 'C-5', seal: 'S-4475', weight: 1.1, contents: '빈 7인치 플라스틱 릴 3개' },
      { id: 'C-6', seal: 'S-4476', weight: 1.4, contents: '빈 10.5인치 금속 릴 2개' }
    ],

    registry: [
      { no: 'HD-E-990803', title: '1999.08.03 송출 감시 녹음 편집본', spec: '7인치 플라스틱 릴 · 흰 리더 · 19cm/s', place: '열린 선반 1999-B', punch: '—' },
      { no: 'HD-L-990803', title: '송출 감시 녹음 예비', spec: '10.5인치 금속 릴(NAB) · 빨간 리더 · 4.75cm/s', place: '금고 (21:30 봉인)', punch: 'L-990803' },
      { no: 'HD-P-020114', title: '해담FM 개국 10주년 특집', spec: '10.5인치 금속 릴 · 흰 리더 · 19cm/s', place: '열린 선반 2002-A', punch: '—' },
      { no: 'HD-L-990802', title: '송출 감시 녹음 1999.08.02', spec: '10.5인치 금속 릴 · 빨간 리더 · 4.75cm/s', place: '폐기 완료 (2004)', punch: 'L-990802' },
      { no: 'HD-E-030721', title: '태풍 특보 편집본', spec: '7인치 플라스틱 릴 · 흰 리더', place: '열린 선반 2003-C', punch: '—' }
    ],

    /* ───────── 증거 ───────── */
    evidence: {
      /* 서하 — 도입 */
      s_photo_onair: { owner: 'seoha', type: 'photo', title: '사진 · 로비, 마지막 인사', short: '21:46:02 로비. 스피커 아래 ON AIR 중계등.',
        photo: { art: 'photoLobby', exif: '21:46:02', caption: '로비 천장 스피커에서 윤서진 국장의 마지막 인사가 나오던 중. 스피커 옆 ON AIR 중계등은 꺼져 있다.' },
        times: [{ t: '21:46:02', clock: 'std', label: '로비 사진 (ON AIR 중계등 꺼짐)' }] },
      s_photo_corridor: { owner: 'seoha', type: 'photo', title: '사진 · 어두워진 복도', short: '21:47:12 유리문 너머 복도가 깜깜하다.',
        photo: { art: 'photoCorridor', exif: '21:47:12', caption: '유리문 너머 복도. 끝에 비상구 표시등만 보인다. 로비 불은 켜져 있었다.' },
        times: [{ t: '21:47:12', clock: 'std', label: '어두운 복도 사진' }] },
      s_note_prologue: { owner: 'seoha', type: 'paper', title: '서하의 수첩', short: '오늘 밤 직접 본 것.',
        doc: { style: 'note', lines: [
          '21:30쯤 비 시작. 우산 챙기길 잘했다.',
          '21:45 국장 마지막 인사 — 로비 스피커.',
          '21:47 복도 불 꺼짐 / 21:49 다시 켜짐 (내 휴대전화 시계)',
          '22:06 민해수: 금고가 비었다고.',
          '한도윤 — 머리카락이 젖어 있었다. 실내에 있었다면서?'
        ] },
        times: [{ t: '21:47:00', clock: 'std', label: '서하가 본 복도 소등 (분 단위)' }, { t: '21:49:00', clock: 'std', label: '서하가 본 복도 점등 (분 단위)' }] },

      /* 서하 — 로비 */
      s_onair_lobby: { owner: 'seoha', type: 'object', title: '로비 ON AIR 중계등', short: '스튜디오 A 표시등과 같은 신호로 켜진다.',
        obj: { art: 'objOnair', facts: ['스티커: “스튜디오 A 표시등 연동 · 기술국”', '지금은 꺼져 있다.', '이 표시등이 언제 켜지는지는 기술 담당이 안다.'] } },
      s_notice: { owner: 'seoha', type: 'paper', title: '폐국 절차 안내', short: '20:00 중앙난방 정지 … 00:00 송신 종료.',
        doc: { style: 'notice', head: '해담FM 폐국 절차 안내 (11월 30일)', lines: [
          '18:00  야간 경비 계약 종료',
          '18:00  마지막 인사 리허설 (스튜디오 A)',
          '20:00  중앙난방 정지',
          '21:30  자료실 금고 봉인 (편성국장·기록 담당 입회)',
          '21:45  편성국장 마지막 인사',
          '22:00  출입 통제 (정문·하역장·지하 반출대기실)',
          '23:55  마지막 송출 안내',
          '00:00  송신 종료'
        ], foot: '문의: 편성국 (내선 201)' },
        times: [{ t: '20:00:00', clock: 'std', label: '중앙난방 정지 (안내문)' }, { t: '22:00:00', clock: 'std', label: '출입 통제' }] },
      s_umbrellas: { owner: 'seoha', type: 'object', title: '로비 우산꽂이', short: '젖은 우산은 서하의 것 하나뿐.',
        obj: { art: 'objUmbrellas', facts: ['비는 21:30쯤부터 내렸다.', '로비 우산꽂이에서 젖은 것은 서하의 우산뿐이다.', '오늘 밤 건물 안에 있던 사람은 서하, 이안, 윤서진, 한도윤, 민해수 다섯 명.'] } },

      /* 서하 — 접수실·기록실 */
      s_receipt: { owner: 'seoha', type: 'paper', title: '택배 단말기 영수증', short: '21:46:50 도착 · 21:48:15 서명 · 21:49:30 출발.',
        doc: { style: 'receipt', head: '한결택배 배송 확인', lines: [
          '수령처  해담FM 접수실',
          '물품    이관용 포장재 3박스',
          '21:46:50  도착 스캔',
          '21:48:15  수령 서명  민해수',
          '21:49:30  출발 스캔',
          '비고    수령인 대면 확인 · 접수 창구'
        ], foot: '단말기 시각: 통신사 기준' },
        times: [{ t: '21:46:50', clock: 'std', label: '택배 도착 (접수실)' }, { t: '21:48:15', clock: 'std', label: '민해수 수령 서명' }, { t: '21:49:30', clock: 'std', label: '택배 출발' }] },
      s_ccprint: { owner: 'seoha', type: 'paper', title: '감사팀 문서 참조본', short: '21:40:05 기록실 프린터 출력.',
        doc: { style: 'fax', head: '기록이관 감사팀 · 원본 보존 요청 (참조)', lines: [
          '수신: 해담FM 편성국장 / 참조: 기록 담당',
          '대상: 금고 보관 HD-L-990803 및 1999년 8월 송출 관련 자료 일체',
          '요청: 내일 09:00 인수 시까지 이동·열람·복제 금지',
          '제보·문의: 02-6230-0714'
        ], foot: '출력 21:40:05 · 기록실 프린터' },
        times: [{ t: '21:40:05', clock: 'std', label: '감사팀 요청 참조본 출력 (기록실)' }] },
      s_logger_records: { owner: 'seoha', type: 'object', title: '기록실 벽면 기록계', short: '번호 HL-25.',
        obj: { art: 'objLogger', label: 'HL-25', facts: ['설치 위치: 1층 기록실 벽', '번호 스티커: HL-25'] } },
      s_editcopy: { owner: 'seoha', type: 'object', title: '7인치 편집본 릴', short: '민해수의 서랍. “1999.08.03 편집본”.',
        obj: { art: 'objReel7', facts: ['7인치 플라스틱 릴, 흰 리더 테이프.', '상자 라벨: “HD-E-990803 · 1999.08.03 감시녹음 편집본”.', '상자 한 변 약 18cm.', '릴 곳곳에 편집 테이프로 이어 붙인 자국.'] } },
      s_editnote: { owner: 'seoha', type: 'paper', title: '1999년 편집 작업 메모', short: '“02:41 경보 구간을 02:07 위치로.”',
        doc: { style: 'hand', head: '99. 8. 4  감시녹음 편집본 작업', lines: [
          '원본: 10.5인치 감시녹음 (8/3 01:00~05:00)',
          '02:41 경보 구간(1분 10초)을 02:07 위치로 옮겨 붙임',
          '02:07~02:41 사이 프로그램 일부 잘라 냄',
          '지시: 윤 PD / 국장 승인',
          '원본 소거 지시 받음 → 소거 안 함.',
          '금고 대장에 “HD-L-990803 감시녹음 예비”로 올림.',
          '— 민'
        ] },
        times: [] },
      s_1999memo: { owner: 'seoha', type: 'paper', title: '1999년 경위서 사본', short: '공식 기록: “02:07 경보 송출”.',
        doc: { style: 'form', head: '은하천 범람 관련 송출 경위서 (1999.08.05)', lines: [
          '02:05  상곡저수지 방류 통보 팩스 수신',
          '       7월 허위 팩스 건 이후 확인 절차에 따라 저수지에 전화 확인',
          '       회선 혼잡으로 확인 지연',
          '02:07  방류 경보 송출',
          '근거: 송출 감시 녹음 (편집본 HD-E-990803)'
        ], stamp: '해담FM', foot: '작성: 편성국' } },

      /* 서하 — 경비실 */
      s_cctv: { owner: 'seoha', type: 'cctv', title: '복도 CCTV 녹화본', short: '21:46~22:11 녹화기 표시 시각 기준 장면 9개.' },
      s_guardlog: { owner: 'seoha', type: 'paper', title: '경비 근무일지', short: '“복도 카메라 시계 안 맞음 — 수리 요청”.',
        doc: { style: 'form', head: '경비 근무일지 · 11월', lines: [
          '3/14  복도 카메라 녹화기 시계 안 맞음. 수리 요청 (미처리)',
          '11/30  야간 경비 계약 18:00 종료. 녹화는 계속.',
          '11/30  인계: 녹화기 비밀번호는 기술국에 전달'
        ] } },

      /* 서하 — 복도 */
      s_camera: { owner: 'seoha', type: 'object', title: '복도 카메라', short: '서쪽 끝 천장, 동쪽을 본다. 적외선 겸용.',
        obj: { art: 'objCamera', facts: ['로비 유리문 위 천장에서 동쪽을 향한다.', '자료실 문, 송출실 문, 동측 계단 문이 한 화면에 들어온다.', '렌즈 둘레에 적외선 LED. 어두워지면 흑백 적외선으로 바뀐다.'] } },
      s_eaststair: { owner: 'seoha', type: 'object', title: '동측 계단', short: '지하 1층~2층 연결. 옥상과는 이어지지 않는다.',
        obj: { art: 'objStair', facts: ['지하 반출대기실 · 1층 복도 · 2층을 잇는다.', '옥상으로는 서측 계단으로만 갈 수 있다.', '2층 계단참은 편성국장실 문 바로 옆이다.'] } },

      /* 서하 — 자료실 */
      s_vault: { owner: 'seoha', type: 'object', title: '자료실 금고', short: '봉인 서명이 어긋나 있다. 안은 비었다.',
        obj: { art: 'objVault', facts: [
          '다이얼 금고. 봉인 기록표: “21:30 봉인 · 내용물 HD-L-990803 1점 · 서명 윤서진 / 민해수”.',
          '문틈의 봉인 테이프는 새것이다. 테이프 위 서명과 금고 문에 번진 원래 서명 자국이 맞지 않는다.',
          '안은 비었다. 선반 먼지에 한 변 약 27cm 정사각 자국이 남아 있다.'
        ] } },
      s_logger_vault: { owner: 'seoha', type: 'object', title: '금고 안 기록계', short: '번호 HL-22.',
        obj: { art: 'objLogger', label: 'HL-22', facts: ['설치 위치: 금고 안쪽 벽', '번호 스티커: HL-22', '문을 열면 바깥 공기가 들어와 습도가 튄다.'] } },
      s_logger_archive: { owner: 'seoha', type: 'object', title: '자료실 벽면 기록계', short: '번호 HL-17.',
        obj: { art: 'objLogger', label: 'HL-17', facts: ['설치 위치: 자료실 벽 (금고 바깥)', '번호 스티커: HL-17'] } },
      s_shelf: { owner: 'seoha', type: 'object', title: '열린 선반 1999-B', short: '“편집본 (7인치)” 칸이 비었다.',
        obj: { art: 'objShelf', facts: ['칸 표지: “1999.08.03 감시녹음 편집본 (7인치) HD-E-990803”.', '그 칸만 비어 있고, 먼지 자국은 한 변 약 18cm.', '금고와 달리 잠금이 없는 열린 선반이다.'] } },
      s_gloves: { owner: 'seoha', type: 'object', title: '면장갑 상자', short: '자료실 공용 흰 면장갑.',
        obj: { art: 'objGloves', facts: ['테이프 취급용 흰 면장갑 상자. 절반쯤 비었다.', '자료실에 드나드는 사람이면 누구나 꺼내 쓸 수 있다.'] } },
      s_procedure: { owner: 'seoha', type: 'paper', title: '폐국 봉인 절차서', short: '금고 다이얼 번호 보유자 2인.',
        doc: { style: 'form', head: '폐국 자료 봉인 절차 (발췌)', lines: [
          '3. 금고 다이얼 번호는 편성국장과 기록 담당 2인만 보유한다.',
          '4. 봉인 해제는 2인 입회를 원칙으로 한다.',
          '5. 자료실 출입 카드: 개인 카드 또는 예비 카드(#07, 부조정실 보관).',
          '6. 예비 카드 사용 시 사용자와 시각을 기록한다.'
        ], stamp: '기록실' } },

      /* 서하 — 스튜디오 A */
      s_radiator: { owner: 'seoha', type: 'object', title: '스튜디오 A 라디에이터', short: '중앙난방용 주철 라디에이터. 지금은 차갑다.',
        obj: { art: 'objRadiator', facts: ['원고대에서 두 걸음 거리. 마이크와 가깝다.', '중앙난방 배관에 물려 있다. 손을 대 보니 차갑다.', '옆 벽에 기록계가 있다: HL-11.'] } },
      s_script: { owner: 'seoha', type: 'paper', title: '마지막 인사 원고', short: '연필 표시 “T2 OK”.',
        doc: { style: 'script', head: '21:45 편성국장 마지막 인사', lines: [
          '해담FM 98.7, 윤서진입니다.',
          '오늘 자정, 해담FM은 마지막 송출을 합니다.',
          '서른네 해 동안 이 주파수로 여러분의 밤을 지켜 왔습니다.',
          '지금 시각, 아홉 시 사십오 분.',
          '제가 이 방송국에 처음 왔을 때, 저는 야간 PD였습니다. …'
        ], hand: ['18:00 리허설', 'T1 ×', 'T2 OK'] } },
      s_soundproof: { owner: 'seoha', type: 'object', title: '스튜디오 A 방음문', short: '창이 없는 방음실. 바깥 소리가 들어오지 않는다.',
        obj: { art: 'objDoor', facts: ['이중 방음문. 스튜디오 A에는 창이 없다.', '빗소리가 들릴 수 없는 방이다.', '문 위에 스튜디오 ON AIR 표시등.'] } },

      /* 서하 — 부조정실 */
      s_console: { owner: 'seoha', type: 'object', title: '부조정실 콘솔 (현재 상태)', short: 'MIC 1 내려감 · CART 07 불 켜짐.',
        obj: { art: 'objConsole', facts: ['MIC 1 페이더는 맨 아래.', 'CART 07 버튼에 초록 불.', '지금 상태일 뿐, 21:45에 어땠는지는 장비 기록을 봐야 한다.'] } },
      s_cuesheet: { owner: 'seoha', type: 'paper', title: '부조정실 큐시트', short: '18:00 리허설 T1 NG / T2 OK · 21:45 국장 인사(생).',
        doc: { style: 'form', head: '11/30 마지막 날 큐시트', lines: [
          '18:00  리허설 — 진행 윤서진 / 엔지니어 한도윤',
          '       T1 NG (기침)   T2 OK',
          '21:45  편성국장 마지막 인사 (생)',
          '21:50  음악 블록 (자동)',
          '23:55  마지막 송출 안내 (이안)'
        ] } },
      s_keybox: { owner: 'seoha', type: 'object', title: '부조정실 키 보관함', short: '예비 카드 #07이 다른 고리에 걸려 있다.',
        obj: { art: 'objKeybox', facts: ['고리 이름표: #03 기술 · #05 B1 반출 · #07 예비.', '#07 예비 카드가 자기 고리가 아닌 #05 고리에 걸려 있다.', '#05 고리 원래 카드는 그 아래 #07 고리에 있다. 서둘러 돌려놓은 듯하다.'] } },

      /* 서하 — 2층 동측 계단참 */
      s_switch: { owner: 'seoha', type: 'object', title: '2층 동측 조명 스위치반', short: '1층 복도 조명을 여기서 끈다. 경첩에 흰 보풀.',
        obj: { art: 'objSwitch', facts: ['스위치: 1층 복도 / 계단 / 지하 반출대기실.', '야간 순찰용이라 잠금이 없다.', '덮개 경첩에 흰 면 보풀이 걸려 있다.'] } },

      /* 서하 — 편성국장실 */
      s_fax: { owner: 'seoha', type: 'paper', title: '감사팀 팩스 원본', short: '21:40:02 수신. “이동·열람 금지”.',
        doc: { style: 'fax', head: '기록이관 감사팀 · 원본 보존 요청', lines: [
          '수신: 해담FM 편성국장 윤서진',
          '대상: 금고 보관 HD-L-990803 (1999.08.03 송출 감시 녹음 원본)',
          '요청: 내일 09:00 인수 시까지 이동·열람·복제 금지',
          '수신 확인 전화를 드리겠습니다.',
          '제보·문의: 02-6230-0714'
        ], foot: '수신 21:40:02 · 편성국장실' },
        times: [{ t: '21:40:02', clock: 'std', label: '감사팀 팩스 수신 (국장실)' }] },
      s_cutseal: { owner: 'seoha', type: 'object', title: '잘린 봉인 테이프', short: '국장실 휴지통. 서명 “윤서진 / 민해수 21:30”.',
        obj: { art: 'objSeal', facts: ['봉인 테이프 조각. 양끝이 칼로 반듯하게 잘렸다.', '서명: “윤서진 / 민해수 21:30”.', '금고 문에 남은 원래 서명 자국과 이어진다.'] } },
      s_deskphone: { owner: 'seoha', type: 'object', title: '국장실 책상 전화', short: '부재중 1 — 21:47 02-6230-0714.',
        obj: { art: 'objPhone', facts: ['화면: “부재중 전화 1”', '21:47  02-6230-0714', '수화기는 제자리에 있다.'] },
        times: [{ t: '21:47:00', clock: 'std', label: '국장실 부재중 전화 (분 단위)' }] },
      s_coatgloves: { owner: 'seoha', type: 'object', title: '코트 주머니의 면장갑', short: '흰 면장갑 한 켤레. 손끝에 회색 먼지.',
        obj: { art: 'objGloves', facts: ['윤서진의 코트 주머니에서 나온 흰 면장갑.', '손끝에 회색 먼지가 묻어 있다. 금고 선반 먼지와 색이 비슷하다.', '자료실 공용 장갑과 같은 제품이다.'] } },

      /* 서하 — 옥상 */
      s_roofdoor: { owner: 'seoha', type: 'object', title: '옥상 철문 안쪽', short: '바닥에 빗물. 문이 한동안 열려 있었다.',
        obj: { art: 'objRoofdoor', facts: ['철문 안쪽 바닥에 빗물이 고여 있다.', '옥상은 서측 계단으로만 올라올 수 있다.'] } },
      s_umbrella: { owner: 'seoha', type: 'object', title: '옥상 출입구의 젖은 우산', short: '기술국 비품. 손잡이에 “한” 테이프.',
        obj: { art: 'objUmbrella', facts: ['아직 물이 떨어지는 장우산.', '손잡이 스티커: “기술국 비품”. 그 위에 네임펜으로 “한”.'] } },

      /* 서하 — 지하 반출대기실 */
      s_boxes: { owner: 'seoha', type: 'object', title: '선반 C 운송 상자', short: '상자 6개의 봉인 번호와 무게.',
        obj: { art: 'objBoxes', facts: ['빨간 운송 상자 C-1~C-6. 겉에는 “청솔자원 · 폐기”만 적혀 있다.', '상자마다 업체 봉인 스티커와 번호가 있다.', '계량대에 올리면 무게를 잴 수 있다.'] } },
      s_ledger: { owner: 'seoha', type: 'paper', title: '반출 대장과 예비 봉인', short: '예비 봉인 S-4478이 없다. 사용 기록은 빈칸.',
        doc: { style: 'form', head: '청솔자원 반출 대장 · 예비 봉인', lines: [
          '예비 봉인 4매 지급: S-4477 · S-4478 · S-4479 · S-4480',
          '남은 것: S-4477 · S-4479 · S-4480',
          '사용 기록 (번호 / 상자 / 사유 / 서명):  (빈칸)'
        ] } },
      s_scrap: { owner: 'seoha', type: 'object', title: '고철 수거함의 회색 상자', short: '“HD-L-990803” 상자 속 빈 릴과 찢어진 봉인.',
        obj: { art: 'objScrap', facts: ['회색 자료 상자. 모서리 스티커: “HD-L-990803”.', '안에는 빈 10.5인치 금속 릴 하나.', '릴에 업체 봉인 스티커가 찢긴 채 붙어 있다: “S-4474”.'] } },
      s_logger_b1: { owner: 'seoha', type: 'object', title: '반출대기실 기록계', short: '번호 HL-30.',
        obj: { art: 'objLogger', label: 'HL-30', facts: ['설치 위치: 지하 반출대기실 기둥', '번호 스티커: HL-30'] } },
      s_reel: { owner: 'seoha', type: 'object', title: 'C-4 속의 릴', short: '10.5인치 금속 릴 · 빨간 리더 · 펀칭 L-990803.',
        obj: { art: 'objReel10', facts: ['10.5인치 금속 릴(가운데 구멍이 큰 NAB 허브). 테이프가 가득 감겨 있다.', '리더 테이프는 빨간색. 끝에 구멍으로 찍은 표식: “L-990803”.', '릴 옆면에 라벨을 뜯어낸 자국.'] } },

      /* 이안 — 도입 */
      i_note_monitor: { owner: 'ian', type: 'paper', title: '이안의 모니터 메모', short: '21:45 송출 정상. 21:47쯤 복도 조명 알림.',
        doc: { style: 'note', lines: [
          '21:45~21:50 국장 인사 송출. 레벨 정상, 끊김 없음.',
          '21:47쯤 건물 패널 알림: 1층 복도 조명 OFF. 2분 뒤 복구. 정전 아님.',
          '송출실 시계 = GPS 동기화 (표준시).'
        ] } },

      /* 이안 — 건물 관리 */
      i_bms_light: { owner: 'ian', type: 'log', title: '건물 기록 · 조명', short: '21:47:05 1층 복도 OFF (2F 동측 스위치반).',
        log: { system: 'BMS · 조명 회로', cols: ['표준시', '구역', '이벤트', '조작 위치'], rows: [
          ['17:25:10', 'B1 반출대기실', 'ON', '동작 감지'],
          ['17:41:30', 'B1 반출대기실', 'OFF', '동작 감지'],
          ['20:09:50', 'B1 반출대기실', 'ON', '동작 감지'],
          ['20:14:30', 'B1 반출대기실', 'OFF', '동작 감지'],
          ['21:47:05', '1층 복도', 'OFF', '수동 · 2F 동측 계단 스위치반'],
          ['21:49:10', '1층 복도', 'ON', '수동 · 2F 동측 계단 스위치반'],
          ['21:50:40', 'B1 반출대기실', 'ON', '동작 감지'],
          ['21:53:10', 'B1 반출대기실', 'OFF', '동작 감지']
        ], note: '건물 관리 서버는 NTP로 표준시를 맞춘다.' },
        times: [
          { t: '20:09:50', clock: 'std', label: 'B1 반출대기실 동작 감지' },
          { t: '21:47:05', clock: 'std', label: '1층 복도 조명 OFF (2F 동측)' },
          { t: '21:49:10', clock: 'std', label: '1층 복도 조명 ON (2F 동측)' },
          { t: '21:50:40', clock: 'std', label: 'B1 반출대기실 동작 감지' }
        ] },
      i_bms_access: { owner: 'ian', type: 'log', title: '건물 기록 · 출입', short: '자료실: #02 21:41:20 · #07 21:47:30.',
        log: { system: 'BMS · 출입 카드', cols: ['표준시', '문', '카드', '비고'], rows: [
          ['17:24:50', 'B1 반출대기실', '#05', '업체 입회'],
          ['21:10:00', '송출실', '#04', ''],
          ['21:30:05', '자료실', '#01', '동반 입실'],
          ['21:36:40', '자료실', '—', '퇴실 감지'],
          ['21:41:20', '자료실', '#02', ''],
          ['21:43:50', '자료실', '—', '퇴실 감지'],
          ['21:47:30', '자료실', '#07', ''],
          ['21:48:30', '자료실', '—', '퇴실 감지'],
          ['22:04:10', '자료실', '#02', '']
        ], note: '자료실 출입문은 복도 쪽 하나뿐이다. 카드 주인은 [카드 대장] 참고.' },
        times: [
          { t: '21:30:05', clock: 'std', label: '자료실 #01 (봉인 입회)' },
          { t: '21:41:20', clock: 'std', label: '자료실 #02 출입' },
          { t: '21:43:50', clock: 'std', label: '자료실 퇴실 감지' },
          { t: '21:47:30', clock: 'std', label: '자료실 #07 출입' },
          { t: '21:48:30', clock: 'std', label: '자료실 퇴실 감지' },
          { t: '22:04:10', clock: 'std', label: '자료실 #02 출입' }
        ] },
      i_bms_doors: { owner: 'ian', type: 'log', title: '건물 기록 · 문 센서', short: '옥상 문 21:44:20 열림 · 21:49:40 닫힘.',
        log: { system: 'BMS · 문 센서', cols: ['표준시', '문', '상태'], rows: [
          ['21:44:20', '옥상 출입문 (서측 계단)', '열림'],
          ['21:49:40', '옥상 출입문 (서측 계단)', '닫힘'],
          ['22:00:00', '정문 · 하역장 셔터', '잠금']
        ], note: '문 센서는 열림과 닫힘만 기록한다. 누가 드나들었는지는 남지 않는다.' },
        times: [{ t: '21:44:20', clock: 'std', label: '옥상 문 열림' }, { t: '21:49:40', clock: 'std', label: '옥상 문 닫힘' }] },
      i_bms_env: { owner: 'ian', type: 'log', title: '건물 기록 · 난방·환경', short: '20:00 중앙난방 정지 · 21:30 강우 감지.',
        log: { system: 'BMS · 설비', cols: ['표준시', '설비', '상태'], rows: [
          ['18:00:00', '중앙난방', '가동 중'],
          ['20:00:00', '중앙난방', '정지 (폐국 절차)'],
          ['21:30:20', '옥상 우량 센서', '강우 감지'],
          ['22:00:00', 'B1 반출대기실', '출입 잠금 (통제)']
        ] },
        times: [{ t: '20:00:00', clock: 'std', label: '중앙난방 정지' }, { t: '21:30:20', clock: 'std', label: '비 시작 (우량 센서)' }] },
      i_cardreg: { owner: 'ian', type: 'log', title: '출입 카드 대장', short: '#07 예비 카드는 2F 부조정실 키 보관함.',
        log: { system: '카드 대장', cols: ['카드', '소지·보관'], rows: [
          ['#01', '편성국장 윤서진 (개인)'],
          ['#02', '기록 담당 민해수 (개인)'],
          ['#03', '기술국 한도윤 (개인)'],
          ['#04', '기술국 이안 (개인)'],
          ['#05', 'B1 반출 · 기술국 보관'],
          ['#07', '예비 · 2층 부조정실 키 보관함']
        ] } },

      /* 이안 — 센서 */
      i_loggers: { owner: 'ian', type: 'graph', title: '센서 기록계 6대', short: '19:30~22:10 온도·습도. 위치 대장 없음.' },

      /* 이안 — 음원 */
      i_rec_onair: { owner: 'ian', type: 'audio', rec: 'onair', title: '송출 감시 녹음 21:44:30~', short: '21:45 마지막 인사가 실제로 송출된 소리.',
        times: [{ t: '21:45:00', clock: 'std', label: '마지막 인사 송출 시작' }, { t: '21:50:00', clock: 'std', label: '마지막 인사 송출 끝' }] },
      i_rec_t1: { owner: 'ian', type: 'audio', rec: 't1', title: 'REC_1800_T1.wav', short: '리허설 Take 1 (2분 10초).' },
      i_rec_t2: { owner: 'ian', type: 'audio', rec: 't2', title: 'REC_1800_T2.wav', short: '리허설 Take 2 (5분).' },
      i_rec_backup: { owner: 'ian', type: 'audio', rec: 'backup', title: 'BACKUP_FAREWELL.mp3', short: '비상용 대체 음원 (음악만).' },
      i_match: { owner: 'ian', type: 'paper', title: '음원 대조 결과', short: '송출 녹음 = REC_1800_T2 (+30.0초).',
        doc: { style: 'note', lines: [
          '송출 감시 녹음 21:44:30~ 와 REC_1800_T2.wav 대조',
          'T2를 30.0초 뒤로 놓으면 기침 2회, 종이 소리, 금속음 7회 위치가 모두 겹친다.',
          '21:45:00~21:50:00 송출 = 18시 리허설 Take 2.'
        ] } },

      /* 이안 — 문서·장비 */
      i_tapereg: { owner: 'ian', type: 'paper', title: '기술국 테이프 관리 규정', short: '감시 녹음 원본: 10.5인치 금속 · 빨간 리더.',
        doc: { style: 'form', head: '기술국 테이프 관리 규정 (발췌)', lines: [
          '감시 녹음(로깅) 원본: 10.5인치 금속 릴(NAB 허브), 4.75cm/s, 빨간 리더.',
          '편집본·사본: 7인치 플라스틱 릴, 흰 리더.',
          '원본 리더 끝에는 등록번호를 펀칭한다 (예: L-000000).',
          '보관 상자: 10.5인치용 한 변 약 27cm / 7인치용 약 18cm.'
        ] } },
      i_manifest: { owner: 'ian', type: 'log', title: '폐기 업체 반출 목록', short: '청솔자원 17:42 메일. 선반 C 상자별 무게·봉인.',
        log: { system: '청솔자원 → 편성국장 (참조: 기술국) · 17:42', cols: ['상자', '내용', '무게', '봉인'], rows: [
          ['C-1', '빈 릴 10.5인치 ×1', '0.9kg', 'S-4471'],
          ['C-2', '폐기 녹음 테이프 7인치 ×4', '2.4kg', 'S-4472'],
          ['C-3', '빈 릴 10.5인치 ×1', '0.9kg', 'S-4473'],
          ['C-4', '빈 릴 10.5인치 ×1', '0.9kg', 'S-4474'],
          ['C-5', '빈 릴 7인치 ×3', '1.1kg', 'S-4475'],
          ['C-6', '빈 릴 10.5인치 ×2', '1.4kg', 'S-4476']
        ], note: '예비 봉인 S-4477~S-4480(4매)은 B1 반출 대장 서랍에 둡니다. 재봉인 시 번호와 사유를 대장에 적어 주세요. 반출은 감사 종료 후.' } },
      i_chanlog: { owner: 'ian', type: 'log', title: '콘솔 채널 기록', short: 'MIC 1은 18:09:40 이후 열리지 않았다.',
        log: { system: '부조정실 콘솔 · 채널', cols: ['표준시', '채널', '상태'], rows: [
          ['18:00:05', 'MIC 1 (스튜디오 A)', 'OPEN'],
          ['18:09:40', 'MIC 1 (스튜디오 A)', 'CLOSE'],
          ['21:45:00', 'CART 07', '→ PGM'],
          ['21:50:00', 'AUTO 음악', '→ PGM'],
          ['22:10:00', 'MIC 1~3', 'CLOSED (현재)']
        ], note: 'PGM = 실제로 송출되는 신호.' },
        times: [{ t: '21:45:00', clock: 'std', label: 'CART 07 → 송출' }] },
      i_cartlog: { owner: 'ian', type: 'log', title: '자동송출 기록', short: '21:36:12 CART 07 LOAD REC_1800_T2 · USER HAN.',
        log: { system: '자동송출 서버', cols: ['표준시', '동작', '내용', '사용자'], rows: [
          ['18:12:40', '저장', 'REC_1800_T1.wav (2:10)', 'HAN'],
          ['18:12:55', '저장', 'REC_1800_T2.wav (5:00)', 'HAN'],
          ['21:36:12', 'CART 07 LOAD', 'REC_1800_T2.wav', 'HAN'],
          ['21:36:20', 'CART 07 예약', '21:45:00 PGM', 'HAN'],
          ['21:45:00', 'CART 07 PLAY', '→ PGM', '예약'],
          ['21:50:00', 'CART 07 END', 'AUTO 음악 블록', '예약']
        ] },
        times: [{ t: '21:36:12', clock: 'std', label: 'CART 07에 T2 장전 (HAN)' }] },
      i_manual: { owner: 'ian', type: 'paper', title: 'ON AIR 표시등 배선 메모', short: '마이크 채널이 열릴 때만 켜진다.',
        doc: { style: 'note', head: '기술국 배선 메모 (2011)', lines: [
          'ON AIR 표시등 (스튜디오 A 문 위 + 로비 중계등)',
          '= 스튜디오 마이크 채널 MIC 1~3 중 하나라도 OPEN이면 점등.',
          '카트·자동 송출 재생만으로는 켜지지 않음.'
        ] } },
      i_audit: { owner: 'ian', type: 'paper', title: '감사팀 회신', short: '제보 전화 21:44:40 (4분 15초, 빗소리) · 국장 무응답 2회.',
        doc: { style: 'mail', head: '기록이관 감사팀 → 해담FM 송출실 이안 님 (22:41)', lines: [
          '오늘 저녁 저희 쪽 기록을 알려 드립니다.',
          '20:31:05  제보 전화 수신 (2분 48초)',
          '21:40:00  원본 보존 요청 발송 (편성국장실 팩스, 기록실 메일 참조)',
          '21:44:40  같은 제보자 전화 수신 (4분 15초). 통화 내내 빗소리와 바람 소리.',
          '21:47:40  편성국장실 유선 — 수신 확인 전화, 응답 없음',
          '21:48:10  윤서진 국장 휴대전화 — 응답 없음',
          '제보자 신원은 본인 동의 없이 알려 드릴 수 없습니다. 내일 09:00 도착합니다.'
        ] },
        times: [
          { t: '21:44:40', clock: 'std', label: '감사팀 제보 전화 시작 (빗소리)' },
          { t: '21:47:40', clock: 'std', label: '국장실 유선 무응답 (감사팀)' },
          { t: '21:48:10', clock: 'std', label: '국장 휴대전화 무응답 (감사팀)' },
          { t: '21:48:55', clock: 'std', label: '감사팀 제보 전화 끝' }
        ] },
      i_registry: { owner: 'ian', type: 'log', title: '자료 대장 검색 결과', short: '자료 대장에서 찾은 항목.' }
    },

    /* ───────── 인터뷰 (서하) ───────── */
    topics: [
      /* 윤서진 */
      { id: 't_yoon_where', who: 'yoon', q: '21:45 무렵 어디 계셨어요?',
        a: ['스튜디오에서 마지막 인사를 했죠.', '서하 씨도 로비에서 들었잖아요. 제 목소리.'] },
      { id: 't_yoon_reel', who: 'yoon', q: '사라진 원본은 어떤 녹음인가요?',
        a: ['1999년 8월, 은하천 범람 때의 송출 감시 녹음이에요.', '감사팀이 내일 가져가기로 했어요. 그날 일은… 다들 지금도 괴로워해요.'] },
      { id: 't_yoon_wait', who: 'yoon', q: '왜 아침까지 기다리자고 하세요?',
        a: ['감사팀도 경찰도 아침에 와요.', '밤새 우리끼리 뒤지다가 증거만 망가뜨릴까 봐 그래요.'] },
      { id: 't_yoon_live', who: 'yoon', q: '금고가 열린 21:47:50에도 방송 중이셨죠?', unlock: { concl: 'IC1' },
        a: ['네. 21시 45분부터 50분까지 스튜디오에 있었어요.', '그 시간에 제가 자료실에 갔다는 건 말이 안 되죠. 온 동네가 제 목소리를 들었는데.'] },
      { id: 't_yoon_office', who: 'yoon', q: '21:45 방송은 녹음이었습니다.', unlock: { concl: 'IC2' },
        a: ['…목이 쉬어서 리허설 Take 2로 내보냈어요.', '마지막 방송인데 쉰 목소리를 들려주기 싫었어요. 그동안 국장실에서 쉬었고요.'] },
      { id: 't_yoon_phone', who: 'yoon', q: '21:47에 국장실 전화가 울렸는데, 받지 않으셨어요.', unlock: { all: [{ concl: 'IC2' }, { found: 's_deskphone' }] },
        a: ['…그랬나요. 잠깐 화장실에 갔었나 보죠.', '그게 무슨 증거가 돼요?'] },
      { id: 't_yoon_seal', who: 'yoon', q: '국장실 휴지통에서 잘린 봉인 테이프가 나왔어요.', unlock: { all: [{ concl: 'IC2' }, { found: 's_cutseal' }] },
        a: ['그게 왜 제 휴지통에 있는지 저는 몰라요.', '누가 저를 범인으로 만들고 싶은가 보죠. 이 건물에 저를 좋아하는 사람은 많지 않으니까.'] },

      /* 한도윤 */
      { id: 't_han_where', who: 'han', q: '21:45 무렵 어디 계셨어요?',
        a: ['부조정실 콘솔 앞이요. 생방송이었으니까요.'],
        note: '대답하는 동안 그의 어깨와 머리카락 끝이 젖어 있는 게 보인다.' },
      { id: 't_han_1999', who: 'han', q: '1999년 그날 밤을 아세요?',
        a: ['…그날 콘솔에 앉아 있던 게 저예요. 스물두 살이었죠.', '더는 묻지 마세요.'] },
      { id: 't_han_clock', who: 'han', q: '건물 시계들은 다 정확한가요?',
        a: ['송출 장비랑 건물 관리 서버는 표준시예요. GPS랑 NTP로 맞추니까.', '복도 CCTV는… 몇 년째 안 맞을걸요. 얼마나 틀린지는 기록끼리 맞춰 보면 알 거예요.'] },
      { id: 't_han_radiator', who: 'han', q: '스튜디오 A 라디에이터, 소리가 나나요?', unlock: { found: 's_radiator' },
        a: ['나요. 난방이 돌 때 보일러 펌프가 물을 밀 때마다 “딱” 하고 울려요. 41초쯤마다 꼬박꼬박.', '마이크에 다 들어가서 늘 골칫거리였죠. 난방이 끊기면 그 소리도 없어요.'] },
      { id: 't_han_cart', who: 'han', q: '방송이 녹음이었다는 거, 알고 계셨죠?', unlock: { concl: 'IC2' },
        a: ['…국장님이 21시 32분쯤 부조정실에 와서 목이 쉬었다고, Take 2로 내보내 달라고 했어요.', '제가 21시 36분에 카트에 걸었습니다. 마지막 방송인데 녹음이라고 하기 싫어서 생방송이라고 했어요.'] },
      { id: 't_han_absent', who: 'han', q: '그럼 21:44부터 50분까지는 어디 계셨어요?', unlock: { concl: 'IC2' },
        a: ['자리를 비웠어요. 녹음이라 방송 사고 날 일은 없었으니까.', '어디 있었는지는… 지금은 말 못 해요.'] },
      { id: 't_han_roof', who: 'han', q: '옥상 출입구에 한도윤 씨 우산이 있었어요.', unlock: { all: [{ asked: 't_han_absent' }, { found: 's_umbrella' }] },
        a: ['…옥상에 있었어요. 전화를 했어요.', '감사팀이에요. 오늘 저녁에 제보한 사람이 저예요. 휴대전화 기록 보세요.'],
        grants: ['s_hanphone'] },
      { id: 't_han_why', who: 'han', q: '무엇을 제보하셨어요?', unlock: { asked: 't_han_roof' },
        a: ['원본이 금고에 있다는 건 몇 년 전에 민 선생한테 들었어요.', '오늘 저녁 8시 10분쯤 지하에서 국장님이 반출 대장 서랍을 뒤지는 걸 봤어요. 그래서 8시 반에 한 번 걸었고, 9시 44분에 또 걸었어요. 국장님이 스튜디오에 없다고.'] },
      { id: 't_han_keys', who: 'han', q: '부조정실 키 보관함에 손댄 사람이 있나요?', unlock: { all: [{ asked: 't_han_roof' }, { found: 's_keybox' }] },
        a: ['국장님이 21시 32분에 왔을 때 키 보관함 앞에 한참 서 있었어요. 그땐 그냥 그런가 보다 했죠.', '21시 55분쯤엔 부조정실 문 앞에 와서 “고마워요” 하더라고요. 숨이 좀 차 보였어요.'] },
      { id: 't_han_talkback', who: 'han', q: '1999년 그날 밤, 무슨 일이 있었어요?', unlock: { asked: 't_han_roof' },
        a: ['02시 05분에 방류 통보 팩스가 들어왔어요. 저는 경보 원고를 받아서 기다렸고요.', '토크백으로 “확인될 때까지 내보내지 마” 소리를 들었어요. 그 목소리를 27년 동안 들었어요.'] },

      /* 민해수 */
      { id: 't_min_where', who: 'min', q: '21:40부터 50분까지 어디 계셨어요?',
        a: ['기록실이랑 접수 창구에 계속 있었어요.', '택배 기사님이 왔었고요. 이관용 포장재요.'] },
      { id: 't_min_seal', who: 'min', q: '금고 봉인은 어떻게 하셨어요?',
        a: ['21시 30분에 국장님이랑 같이 했어요. 원본 1점 확인하고, 둘이 테이프 위에 서명했어요.', '22시에 감사팀이 봉인 사진을 보내 달래서 가 봤더니… 서명이 이상했어요. 열어 보니 비어 있었고요.'] },
      { id: 't_min_reel', who: 'min', q: '원본은 어떻게 생겼나요?',
        a: ['10.5인치 금속 릴이에요. 감시 녹음이라 리더가 빨간색이고요.', '99년 테이프라 지금은 아무도 안 쓰는 규격이죠.'] },
      { id: 't_min_gloves', who: 'min', q: '흰 장갑은 누가 끼나요?', unlock: { found: 's_cctv' },
        a: ['자료실 드나드는 사람은 다 껴요. 상자째 비치돼 있어요.', '…왜요?'] },
      { id: 't_min_box', who: 'min', q: '21:41에 자료실에 들어가셨죠. 무엇을 들고 나오셨어요?', unlock: { concl: 'IC1' },
        a: ['…네. 들어갔어요. 하지만 금고는 열지도 않았어요.', '들고 나온 건 제 책상 서랍에 있어요. 가서 보세요.'] },
      { id: 't_min_edit', who: 'min', q: '편집 작업 메모를 봤어요.', unlock: { found: 's_editnote' },
        a: ['02:41에 나간 경보를 02:07 자리로 옮겨 붙인 건 저예요. 스물여섯 살이었어요.', '원본은 차마 못 지워서 금고에 다른 이름으로 넣어 뒀어요. 감사팀 요청서를 보고, 그 메모가 무서워서 편집본을 빼 왔어요.'] },
      { id: 't_min_dial', who: 'min', q: '금고 다이얼 번호를 아는 사람은요?', unlock: { concl: 'IC2' },
        a: ['저랑 국장님, 둘뿐이에요.', '자료실 봉인 절차서에도 그렇게 적혀 있어요. 선반 위 바인더요.'] }
    ],

    /* 인터뷰로 얻는 추가 물증 */
    extraEvidence: {
      s_hanphone: { owner: 'seoha', type: 'phone', title: '한도윤의 휴대전화 통화 기록', short: '21:44 02-6230-0714 발신 (4분 15초).',
        phone: { owner: '한도윤', rows: [
          ['발신', '02-6230-0714', '21:44', '4분 15초'],
          ['발신', '02-6230-0714', '20:31', '2분 48초'],
          ['수신', '윤서진 국장', '17:52', '1분 02초']
        ] },
        times: [{ t: '21:44:00', clock: 'std', label: '한도윤 발신 02-6230-0714 (분 단위)' }] }
    },

    /* ───────── 공동 분석 ───────── */
    joints: {
      J1: { act: 1, by: 'ian', title: '영상 시각 보정', where: '건물 관리 기록 → 영상 시각 보정',
        needs: { seoha: ['s_cctv'], ian: ['i_bms_light', 'i_bms_access'] },
        partner: { seoha: '이안이 CCTV 시계를 맞추려면, 당신이 영상에서 본 장면의 녹화기 표시 시각이 필요합니다.' },
        intro: '건물 기록의 사건 하나를 고르고, 같은 순간이 CCTV 화면에 찍힌 표시 시각을 입력한다.',
        pairs: [
          { id: 'light_off', label: '21:47:05 1층 복도 조명 OFF', std: '21:47:05' },
          { id: 'light_on', label: '21:49:10 1층 복도 조명 ON', std: '21:49:10' },
          { id: 'card02', label: '21:41:20 자료실 #02 출입', std: '21:41:20' },
          { id: 'out1', label: '21:43:50 자료실 퇴실 감지', std: '21:43:50' },
          { id: 'card07', label: '21:47:30 자료실 #07 출입', std: '21:47:30' },
          { id: 'out2', label: '21:48:30 자료실 퇴실 감지', std: '21:48:30' }
        ],
        offsetSec: 420,
        fact: 'F_offset' },
      J2: { act: 1, by: 'ian', title: '금고 안 기록계 지정', where: '센서 기록계',
        needs: { seoha: ['s_logger_vault'], ian: ['i_loggers'] },
        partner: { seoha: '이안의 센서 목록에는 설치 위치가 없습니다. 금고 안 기록계 번호를 알려 주세요.' },
        intro: '금고 안에 붙은 기록계를 지정하면 봉인 이후 금고가 열린 순간을 읽을 수 있다.',
        answer: { logger: 'HL-22' },
        feedback: { logger: {
          'HL-17': '문이 열릴 때마다 조금씩 반응한 기록계입니다. 금고 안쪽에 붙은 것인지 서하에게 확인하세요.',
          'HL-30': '이 기록계는 다른 층에 있을 가능성이 큽니다. 서하에게 번호를 다시 확인하세요.',
          'HL-11': '20시부터 온도가 떨어진 방의 기록계입니다. 금고 안이라면 이렇게 크게 식지 않습니다.',
          'HL-14': '송출실 기록계입니다.',
          'HL-25': '거의 변화가 없는 방의 기록계입니다. 서하에게 번호를 다시 확인하세요.' } },
        fact: 'F_vault' },
      J3: { act: 2, by: 'ian', title: '금속음의 출처', where: '음원 작업대',
        needs: { seoha: ['s_radiator', 't_han_radiator'], ian: ['i_rec_onair', 'i_bms_env'] },
        partner: { seoha: '이안이 송출 녹음에서 들은 소리가 무엇인지, 현장에서 본 것과 사람들의 말로 판단해 주세요.' },
        intro: '21:45 송출 녹음에 41초 간격의 금속음이 있다. 그 소리를 낸 것과, 그 소리가 날 수 있었던 시간대를 정한다.',
        fields: [
          { id: 'source', label: '금속음을 낸 것', options: [
            ['rack', '부조정실 장비 랙의 냉각팬'], ['radiator', '스튜디오 A 라디에이터'], ['rain', '옥상 빗물 홈통'],
            ['clock', '스튜디오 벽시계'], ['elevator', '화물 승강기'] ] },
          { id: 'window', label: '그 소리가 녹음될 수 있었던 때', options: [
            ['heating', '중앙난방이 돌던 때 (20:00 이전)'], ['rain', '비가 온 뒤 (21:30 이후)'],
            ['lockdown', '출입 통제 이후 (22:00 이후)'], ['always', '아무 때나'] ] }
        ],
        answer: { source: 'radiator', window: 'heating' },
        feedback: {
          source: { rack: '냉각팬은 이어지는 소음이지 41초마다 한 번씩 울리지 않습니다.', rain: '스튜디오 A가 어떤 방인지 서하에게 확인하세요.',
                    clock: '벽시계 소리는 1초 간격입니다.', elevator: '승강기는 사람이 부를 때만 움직입니다. 규칙적이지 않습니다.' },
          window: { rain: '비와 상관있는 소리인지 다시 확인하세요.', lockdown: '출입 통제와 그 소리는 상관이 없습니다.', always: '그 소리는 늘 나는 소리가 아닙니다. 조건이 있습니다.' }
        },
        fact: 'F_clank' },
      MATCH: { act: 2, by: 'ian', solo: true, title: '음원 대조', where: '음원 작업대 → 비교',
        needs: { seoha: [], ian: ['i_rec_onair', 'i_rec_t2'] },
        intro: '송출 녹음과 리허설 파일을 겹쳐 기침·종이 소리·금속음 위치가 모두 맞는지 확인한다.',
        answer: { rec: 't2', offset: 30, tol: 0.25 },
        fact: 'F_match', grants: ['i_match'] },
      J4: { act: 3, by: 'ian', title: '제보 전화 대조', where: '수신함 → 감사팀 회신',
        needs: { seoha: ['s_hanphone', 's_umbrella'], ian: ['i_audit', 'i_bms_doors'] },
        partner: { seoha: '이안은 감사팀이 받은 전화의 시각과 소리를 알고 있습니다. 한도윤의 통화 기록을 이안에게 알려 주세요.' },
        intro: '감사팀이 21:44:40에 받은 4분 15초짜리 제보 전화. 그 사람이 21:47:50에 어디 있었는지, 무엇이 그걸 증명하는지 정한다.',
        fields: [
          { id: 'who', label: '제보 전화를 건 사람', options: [['yoon', '윤서진'], ['han', '한도윤'], ['min', '민해수'], ['unknown', '알 수 없음']] },
          { id: 'place', label: '21:47:50에 그 사람이 있던 곳', options: [['roof', '옥상'], ['sub', '부조정실'], ['east', '2층 동측 계단'], ['archive', '자료실']] },
          { id: 'proof', label: '그 위치를 끊김 없이 증명하는 기록', options: [
            ['call', '감사팀 통화 기록 (21:44:40~21:48:55, 빗소리·바람)'], ['door', '옥상 문 센서 (21:44:20 열림 · 21:49:40 닫힘)'],
            ['umbrella', '젖은 우산'], ['cart', '자동송출 기록'] ] }
        ],
        answer: { who: 'han', place: 'roof', proof: 'call' },
        feedback: {
          who: { yoon: '휴대전화 통화 기록을 서하에게 확인하세요.', min: '휴대전화 통화 기록을 서하에게 확인하세요.', unknown: '감사팀은 신원을 밝히지 않았지만, 같은 시각의 발신 기록이 현장에 있습니다.' },
          place: { sub: '통화 내내 들린 소리를 다시 보세요.', east: '통화 내내 들린 소리를 다시 보세요.', archive: '통화 내내 들린 소리를 다시 보세요.' },
          proof: { door: '문 센서는 열고 닫은 순간만 남깁니다. 그 사이를 증명하지 못합니다.', umbrella: '우산은 옥상에 갔다는 흔적이지, 그 시각 내내 있었다는 기록은 아닙니다.', cart: '자동송출 기록은 사람의 위치와 상관이 없습니다.' }
        },
        fact: 'F_han' },
      J5: { act: 3, by: 'seoha', title: '원본 상자 찾기', where: '지하 반출대기실 → 선반 C',
        needs: { seoha: ['s_boxes'], ian: ['i_manifest'] },
        partner: { ian: '서하는 상자의 봉인 번호와 무게를 볼 수 있지만, 원래 무엇이 들었는지는 모릅니다. 업체 반출 목록을 읽어 주세요.' },
        intro: '업체 봉인을 뜯으면 되돌릴 수 없다. 봉인 번호와 무게를 업체 목록과 맞춰 본 뒤 하나만 연다.',
        answer: { box: 'C-4' },
        fact: 'F_box', grants: ['s_reel'] },
      J6: { act: 3, by: 'ian', title: '원본 대조', where: '수신함·대장 → 원본 대조',
        needs: { seoha: ['s_reel'], ian: ['i_tapereg'] },
        partner: { seoha: '이안이 자료 대장과 대조하려면 릴의 규격과 리더 끝 표식이 필요합니다.' },
        requires: { joint: 'J5' },
        intro: '서하가 찾은 릴의 규격과 리더 펀칭 번호를 자료 대장의 원본 기록과 맞춘다.',
        fields: [
          { id: 'spec', label: '릴 규격', options: [['m10red', '10.5인치 금속 릴 · 빨간 리더'], ['p7white', '7인치 플라스틱 릴 · 흰 리더'], ['m10white', '10.5인치 금속 릴 · 흰 리더'], ['p7red', '7인치 플라스틱 릴 · 빨간 리더']] },
          { id: 'punch', label: '리더 끝 펀칭 번호', type: 'text', placeholder: '예: L-000000' }
        ],
        answer: { spec: 'm10red', punch: 'L990803' },
        feedback: { spec: '릴 크기와 리더 색을 서하에게 다시 확인하세요.', punch: '대장의 어떤 항목과도 맞지 않습니다. 펀칭 번호를 다시 확인하세요.' },
        fact: 'F_reel' }
    },

    /* ───────── 공동 결론 ───────── */
    conclusions: {
      IC1: { act: 1, title: '공동 결론 1 · 금고가 열린 시각', requires: [{ joint: 'J1' }, { joint: 'J2' }],
        lockedText: '먼저 [영상 시각 보정]과 [금고 안 기록계 지정]을 끝내세요.',
        fields: [
          { id: 'time', label: '봉인 이후 금고가 처음 열린 표준시', options: [
            ['2141', '21:41:20'], ['2143', '21:43:50'], ['2147a', '21:47:30'], ['2147b', '21:47:50'], ['2154', '21:54:30'], ['2155', '21:55:30']] },
          { id: 'card', label: '그 직전 자료실에 들어간 카드', options: [['c01', '#01 편성국장'], ['c02', '#02 기록 담당'], ['c03', '#03 기술국'], ['c07', '#07 예비']] },
          { id: 'out', label: '그 시각 금고 앞에 있을 수 없었던 사람', options: [['yoon', '윤서진'], ['han', '한도윤'], ['min', '민해수']] }
        ],
        answer: { time: '2147b', card: 'c07', out: 'min' },
        feedback: {
          time: { '2154': '[시각 기록] 녹화기 표시 시각을 그대로 쓴 값입니다. 표준시로 보정했나요?',
                  '2155': '[시각 기록] 녹화기 표시 시각을 그대로 쓴 값입니다. 표준시로 보정했나요?',
                  '2141': '[환경 기록] 그 시각 금고 안 기록과 맞지 않습니다.',
                  '2143': '[환경 기록] 그 시각 금고 안 기록과 맞지 않습니다.',
                  '2147a': '[장비 기록] 자료실 문이 열린 시각과 금고가 열린 시각은 서로 다른 장비에 남았습니다.' },
          card: { c02: '[출입 기록] 그 카드는 금고가 열리기 몇 분 전에 쓰였습니다.', c01: '[출입 기록] 그 시각 출입 기록과 맞지 않습니다.', c03: '[출입 기록] 그 시각 출입 기록과 맞지 않습니다.' },
          out: { yoon: '[제3자 기록] 그 시각 이 사람의 위치를 증명하는 외부 기록은 아직 없습니다.',
                 han: '[제3자 기록] 문 센서는 문을 열고 닫은 순간만 남깁니다. 그 사이 이 사람의 위치를 증명하는 외부 기록은 아직 없습니다.' }
        },
        facts: ['F_ic1'] },
      IC2: { act: 2, title: '공동 결론 2 · 21:45 방송의 정체', requires: [{ joint: 'J3' }, { joint: 'MATCH' }],
        lockedText: '먼저 [금속음의 출처]와 [음원 대조]를 끝내세요.',
        fields: [
          { id: 'source', label: '21:45~21:50에 송출된 음원', options: [
            ['live', '스튜디오 A 생방송'], ['t1', 'REC_1800_T1.wav'], ['t2', 'REC_1800_T2.wav'], ['backup', 'BACKUP_FAREWELL.mp3']] },
          { id: 'reasons', label: '생방송이 아니라는 근거 (두 개 고르기)', multi: 2, options: [
            ['clank', '난방이 돌 때만 나는 라디에이터 소리가 들어 있다'], ['onair', 'ON AIR 표시등이 꺼져 있었다 (마이크 채널 닫힘)'],
            ['cough', '기침과 종이 소리 위치가 리허설 파일과 같다'], ['norain', '빗소리가 들리지 않는다'],
            ['ontime', '정각에 맞춰 시작했다'], ['clear', '목소리가 평소보다 맑았다'] ] },
          { id: 'broken', label: '이 결론으로 진술이 무너지는 사람 (모두 고르기)', multi: 'any', options: [['yoon', '윤서진'], ['han', '한도윤'], ['min', '민해수']] }
        ],
        answer: { source: 't2', reasons: ['clank', 'onair', 'cough'], broken: ['yoon', 'han'] },
        feedback: {
          source: { live: '[음원 기록] 방송 속 소리 가운데 21:45에 날 수 없는 소리가 있습니다.', t1: '[음원 대조] 기침과 종이 소리 위치가 맞지 않습니다.', backup: '[송출 기록] 자동송출 기록과 맞지 않습니다.' },
          reasons: { norain: '[공간] 스튜디오 A가 어떤 방인지 다시 확인하세요.', ontime: '[송출 관행] 생방송도 정각에 시작합니다.', clear: '[주관] 인상은 근거가 되지 않습니다.', count: '[근거] 근거를 정확히 두 개 고르세요.' },
          broken: { min: '[진술] 민해수의 진술은 방송과 상관이 없습니다.', missing: '[진술] 방송이 생방송이어야만 성립하는 진술을 모두 고르세요.' }
        },
        facts: ['F_ic2'] },
      FINAL: { act: 3, title: '최종 수사 보고서', requires: [{ joint: 'J4' }, { joint: 'J6' }],
        lockedText: '먼저 [제보 전화 대조]와 [원본 대조]를 끝내세요.',
        sentences: [
          { id: 's1', text: '원본을 금고에서 꺼낸 사람은 {culprit}이다.', cat: '종합',
            fields: [{ id: 'culprit', options: [['yoon', '윤서진'], ['han', '한도윤'], ['min', '민해수']] }] },
          { id: 's2', text: '범인은 {lamp}에서 1층 복도 조명을 끄고, {card} 카드로 자료실에 들어갔다. 근거: {ev}', cat: '건물 기록',
            fields: [
              { id: 'lamp', options: [['panel', '2층 동측 계단 스위치반'], ['console', '송출실 콘솔'], ['guard', '1층 경비실'], ['roof', '옥상 출입구 분전반']] },
              { id: 'card', options: [['c01', '#01'], ['c02', '#02'], ['c03', '#03'], ['c07', '#07 예비']] },
              { id: 'ev', evidence: true, accept: ['i_bms_light', 's_switch', 'i_bms_access', 's_keybox', 's_cctv'] } ] },
          { id: 's3', text: '방송이 녹음이었다고 인정한 뒤 범인이 한 해명은 {rebut}로 반박된다. 근거: {ev}', cat: '제3자 기록',
            fields: [
              { id: 'rebut', options: [['calls', '감사팀의 무응답 통화 기록'], ['receipt', '택배 단말기 기록'], ['roofdoor', '옥상 문 센서 기록'], ['cue', '부조정실 큐시트']] },
              { id: 'ev', evidence: true, accept: ['i_audit', 's_deskphone'] } ] },
          { id: 's4', text: '민해수는 {minProof} 때문에, 한도윤은 {hanProof} 때문에 21:47:50 금고 앞에 있을 수 없었다.', cat: '알리바이',
            fields: [
              { id: 'minProof', options: [['receipt', '택배 단말기 기록'], ['box', '영상 속 작은 상자'], ['gloves', '흰 장갑'], ['print', '감사팀 참조본 출력 시각']] },
              { id: 'hanProof', options: [['call', '감사팀이 받은 제보 전화'], ['door', '옥상 문 센서만으로'], ['cart', '자동송출 기록'], ['wet', '젖은 머리카락']] } ] },
          { id: 's5', text: '원본은 {where}에 숨겨졌고, {seal}로 다시 봉인되어 있었다.', cat: '물증',
            fields: [
              { id: 'where', options: [['c4', '지하 선반 C의 C-4 상자'], ['c2', '지하 선반 C의 C-2 상자'], ['shelf', '자료실 열린 선반 1999-B'], ['drawer', '기록실 책상 서랍']] },
              { id: 'seal', options: [['s4478', '업체 예비 봉인 S-4478'], ['s4474', '업체 봉인 S-4474'], ['vault', '금고 봉인 테이프']] } ] },
          { id: 's6', text: '범인은 원본이 {motive}을 드러내는 것을 막으려 했다. 근거: {ev}', cat: '동기',
            fields: [
              { id: 'motive', options: [['falsify', '1999년 경보가 02:41에 나갔고 그 시각을 고쳐 적게 한 사실'], ['money', '폐국 보상금 분쟁'], ['han', '한도윤의 1999년 실수'], ['min', '민해수가 편집본에 남긴 서명']] },
              { id: 'ev', evidence: true, accept: ['s_editnote', 't_min_edit', 't_han_talkback'] } ] }
        ],
        answer: { s1: { culprit: 'yoon' }, s2: { lamp: 'panel', card: 'c07' }, s3: { rebut: 'calls' },
                  s4: { minProof: 'receipt', hanProof: 'call' }, s5: { where: 'c4', seal: 's4478' }, s6: { motive: 'falsify' } },
        feedback: {
          s1: '[종합] 아래 문장들의 근거와 함께 성립하지 않습니다.',
          s2: '[건물 기록] 조명을 끈 위치나 출입 카드가 기록과 맞지 않습니다.',
          s3: '[제3자 기록] 그 기록은 범인의 해명이 거짓임을 보여 주지 못합니다.',
          s4: '[알리바이] 배제 근거 가운데 그 시각의 위치를 증명하지 못하는 것이 있습니다.',
          s5: '[물증] 원본의 위치나 봉인이 현장과 맞지 않습니다.',
          s6: '[동기] 고른 동기는 확보한 기록과 맞지 않습니다.',
          ev: '[근거] 첨부한 증거가 이 문장을 뒷받침하지 않습니다.'
        } }
    },

    /* 공유 사실 — 공동 분석·결론을 통과하면 사건 보드에 올라간다 */
    facts: {
      F_offset: { text: '복도 CCTV 녹화기 시계는 표준시보다 7분 00초 빠르다.', times: [] },
      F_vault: { text: '금고 안 기록계 HL-22: 봉인(21:30:10) 이후 금고가 처음 열린 순간은 21:47:50.', times: [{ t: '21:47:50', label: '금고 개방 (HL-22)' }] },
      F_ic1: { text: '21:47:30 예비 카드 #07로 자료실 출입 → 21:47:50 금고 개방. 민해수는 21:46:50~21:49:30 접수 창구에서 택배를 받고 있었다.', times: [{ t: '21:47:30', label: '#07 자료실 출입' }] },
      F_clank: { text: '21:45 송출 녹음의 41초 간격 금속음은 스튜디오 A 라디에이터 소리다. 중앙난방이 돌 때만 난다 (20:00 정지).', times: [] },
      F_match: { text: '21:45~21:50 송출 = 18시 리허설 REC_1800_T2.wav.', times: [{ t: '21:45:00', label: 'T2 송출 시작' }] },
      F_ic2: { text: '마지막 인사는 녹음이었다. 생방송을 근거로 한 윤서진(스튜디오)과 한도윤(콘솔)의 진술이 무너졌다.', times: [] },
      F_han: { text: '한도윤은 21:44:40~21:48:55 옥상에서 감사팀과 통화했다 (빗소리·바람). 금고 앞에 있을 수 없었다.', times: [{ t: '21:44:40', label: '한도윤 옥상 통화' }] },
      F_box: { text: '원본은 지하 선반 C의 C-4 상자에 있었다. 봉인은 예비 봉인 S-4478로 바뀌어 있었다.', times: [] },
      F_reel: { text: 'C-4의 릴 = 자료 대장 HD-L-990803 (리더 펀칭 L-990803). 1999년 8월 3일 송출 감시 녹음 원본이다.', times: [] }
    },

    /* ───────── 힌트: 관찰 → 조합 → 구체 ───────── */
    hints: {
      J1: [
        '두 기록에 같은 순간이 함께 남았을 만한 사건을 찾아보세요. 눈에 띄는 변화일수록 좋습니다.',
        '서하는 CCTV에서 화면이 확 바뀌는 장면을, 이안은 건물 관리 기록에서 같은 사건을 찾으세요.',
        '복도 조명이 꺼진 순간을 쓰세요. 건물 기록 21:47:05와 CCTV 표시 21:54:05를 [영상 시각 보정]에 넣으면 됩니다.'
      ],
      J2: [
        '금고 안에도 기록을 남기는 장치가 있습니다.',
        '서하가 금고 안에서 본 장치의 번호를, 이안이 센서 목록에서 지정하세요.',
        '금고 안 기록계는 HL-22입니다.'
      ],
      IC1: [
        '타임라인 화면에서 [CCTV 보정 적용]을 켜고 모든 사건을 다시 늘어놓아 보세요.',
        '금고가 열린 시각에 다른 곳에 있었다는 “다른 사람이 남긴 기록”을 찾으세요.',
        '금고는 21:47:50(HL-22)에 열렸고, 직전 출입 카드는 #07입니다. 택배 단말기는 민해수가 21:46:50~21:49:30 접수 창구에 있었다고 남겼습니다. 영상 속 민해수의 출입은 보정하면 21:41:20~21:43:50입니다.'
      ],
      MIN: [
        '영상에서 민해수는 무언가를 들고 나왔습니다. 그 크기를 기억하세요.',
        '공동 결론 1 이후 민해수에게 새로 물어볼 것이 생겼습니다.',
        '인터뷰에서 민해수에게 21:41 자료실 출입을 물은 뒤, 기록실 책상 서랍을 조사하세요.'
      ],
      J3: [
        '송출 녹음에서 말소리가 아닌 소리에 주목하세요. 규칙적인 소리가 있습니다.',
        '그 소리를 내는 물건은 서하가 스튜디오에서, 그 소리가 나는 조건은 한도윤의 말에서 찾을 수 있습니다.',
        '스튜디오 A 라디에이터는 난방이 돌 때 41초마다 울립니다. 난방은 20:00에 꺼졌습니다.'
      ],
      MATCH: [
        '자동송출 서버에 같은 원고를 읽은 파일이 여럿 있습니다.',
        '음원 비교에서 두 파형을 겹치고 기침·종이 소리·금속음의 위치를 맞춰 보세요.',
        '송출 녹음은 21:44:30부터 시작합니다. REC_1800_T2를 30초 뒤로 밀면 겹칩니다.'
      ],
      IC2: [
        '방송에 목소리가 나간 것과 그 사람이 스튜디오에 있었다는 것은 다른 문제입니다.',
        '녹음이었다면, 생방송이어야만 말이 되는 진술을 한 사람이 누구였는지 떠올려 보세요.',
        '음원은 REC_1800_T2. 근거는 라디에이터 소리·꺼진 ON AIR 표시등·기침 위치 중 두 개. 진술이 무너지는 사람은 방송한 윤서진과 콘솔을 지켰다던 한도윤입니다.'
      ],
      J4: [
        '한도윤은 21:44~21:50에 자리를 비웠다고 인정했습니다. 그가 다녀간 곳에 흔적이 남았습니다.',
        '서하는 우산과 한도윤의 통화 기록을, 이안은 감사팀 회신과 문 센서를 맞춰 보세요.',
        '감사팀이 21:44:40에 받은 4분 15초짜리 전화(빗소리)는 한도윤 휴대전화의 21:44 발신과 같습니다. 그는 옥상에 있었습니다.'
      ],
      J5: [
        '선반 C의 상자 여섯 개 중 하나는 업체가 봉인한 뒤에 누군가 손을 댔습니다.',
        '서하가 읽은 봉인 번호와 무게를 이안의 업체 반출 목록과 하나씩 맞춰 보세요.',
        'C-4는 봉인 번호가 목록(S-4474)과 다르고(S-4478), 무게도 0.8kg 더 나갑니다.'
      ],
      J6: [
        '원본 리더 테이프에는 표식이 있습니다.',
        '서하가 릴 크기·리더 색·펀칭 번호를 읽어 주면 이안이 자료 대장과 맞춥니다.',
        '10.5인치 금속 릴, 빨간 리더, 펀칭 L-990803입니다.'
      ],
      FINAL: [
        '보고서의 문장마다 이미 함께 확인한 사실이 하나씩 짝을 이룹니다. 사건 보드의 공유 사실을 보세요.',
        '배제 근거는 당사자의 말이 아니라 다른 사람이나 장비가 남긴, 끊김 없는 기록이어야 합니다. 동기는 1999년 자료에서 찾으세요.',
        '2층 동측 계단 스위치반·#07 / 감사팀 무응답 기록 / 민해수: 택배 단말기, 한도윤: 감사팀 통화 / C-4·S-4478 / 1999년 시각 조작 지시(편집 작업 메모).'
      ]
    },

    /* ───────── 장면 ───────── */
    scenes: {
      prologue: [
        { time: '21:46', place: '1층 로비', art: 'sceneLobby',
          lines: [
            ['narr', '해담FM의 마지막 밤. 폐국까지 두 시간 남짓.'],
            ['narr', '로비 천장 스피커에서 윤서진 국장의 마지막 인사가 흘러나온다.'],
            ['radio', '“…지금 시각, 아홉 시 사십오 분.”'],
            ['seoha', '기사 첫 장면은 이걸로 하자.']
          ],
          action: { label: '카메라를 든다', grant: { seoha: ['s_photo_onair'] }, sfx: 'shutter', after: '찰칵. 스피커와 로비 안쪽 벽을 한 장에 담았다.' } },
        { time: '21:47', place: '1층 로비', art: 'sceneLobbyDark',
          lines: [
            ['narr', '복도 쪽 유리문 너머가 한순간에 깜깜해진다. 로비 불은 그대로다.'],
            ['seoha', '정전인가?'],
            ['narr', '스피커 속 목소리는 끊기지 않고 이어진다.']
          ],
          action: { label: '유리문 너머를 찍는다', grant: { seoha: ['s_photo_corridor'] }, sfx: 'shutter', after: '복도 끝 비상구 표시등만 초록빛으로 찍혔다.' } },
        { time: '21:49', place: '1층 로비', art: 'sceneLobby',
          lines: [
            ['narr', '2분쯤 지나 복도 불이 다시 들어온다. 복도는 비어 있다.'],
            ['seoha', '47분에 꺼지고 49분에 켜졌어. 적어 두자.']
          ],
          action: { label: '수첩에 적는다', grant: { seoha: ['s_note_prologue'] }, sfx: 'paper', after: '휴대전화 시계를 보며 시각을 적었다.' } },
        { time: '21:58', place: '1층 송출실', art: 'sceneMaster',
          lines: [
            ['narr', '같은 시각, 1층 송출실.'],
            ['ian', '국장님 인사 끝. 레벨 정상. 이제 자정까지 두 시간.'],
            ['narr', '아까 건물 패널에 복도 조명 알림이 떴다. 정전은 아니었다.']
          ],
          action: { label: '모니터 메모를 남긴다', grant: { ian: ['i_note_monitor'] }, sfx: 'click', after: '이안이 송출 일지 옆에 짧게 적었다.' } },
        { time: '22:00', place: '해담FM', art: 'sceneShutter',
          lines: [
            ['narr', '철제 셔터가 내려가는 소리. 감사팀 요청에 따라 출입 통제가 시작됐다.']
          ], sfx: 'shutter' },
        { time: '22:06', place: '1층 로비', art: 'sceneLobby',
          lines: [
            ['min', '국장님! 금고가… 원본이 없어요.'],
            ['yoon', '뭐라고요? 봉인한 지 한 시간도 안 됐는데.'],
            ['narr', '서측 계단에서 한도윤이 내려온다. 머리카락 끝에서 물방울이 떨어진다.'],
            ['han', '무슨 일입니까?'],
            ['yoon', '감사팀은 내일 아침 아홉 시에 와요. 그때까지 아무도 아무것도 건드리지 맙시다.'],
            ['seoha', '(이안에게, 작게) 아침까지 기다리면, 그 테이프가 남아 있을까요?'],
            ['ian', '…송출실 기록은 제가 볼게요. 현장은 서하 씨가 맡아 주세요.'],
            ['narr', '자정, 송신기가 꺼지기 전까지.']
          ] }
      ],
      act2: [
        { time: '22:30', place: '1층 송출실', art: 'sceneMaster',
          lines: [
            ['ian', '민해수 씨가 자료실에서 나온 게 21시 43분 50초예요. 금고는 그 4분 뒤에 열렸고요.'],
            ['seoha', '그럼 민해수 씨는 뭘 들고 나온 거죠? 영상 속 상자는 작았어요.'],
            ['ian', '그리고 21시 47분 50초면… 국장님 인사가 송출되던 중이에요.'],
            ['seoha', '저도 로비에서 들었어요. 그 목소리.'],
            ['ian', '들은 건 목소리죠. 스튜디오가 아니라.']
          ] }
      ],
      act3: [
        { time: '22:50', place: '2층 복도', art: 'sceneHall2',
          lines: [
            ['ian', '송출된 건 여섯 시 리허설 Take 2였어요. 국장님 목소리가 나가는 동안 국장님이 어디 있었는지는 아무도 몰라요.'],
            ['seoha', '콘솔을 지켰다던 한도윤 씨도요.'],
            ['ian', '카트에 파일을 건 계정은 HAN이에요.'],
            ['yoon', '녹음으로 내보낸 건 맞아요. 목이 쉬어서요. 그동안 국장실에서 쉬었어요.'],
            ['yoon', '의심되면 국장실 보세요. 열어 둘게요.'],
            ['ian', '감사팀에도 연락해 둘게요. 지하 반출대기실 잠금은 송출실에서 풀 수 있어요.']
          ] }
      ],
      found: [
        { time: '23:12', place: '지하 반출대기실', art: 'sceneStaging',
          lines: [
            ['seoha', '빨간 리더 끝에 L-990803. 옆면에 라벨을 뜯어낸 자국이 있어요.'],
            ['ian', '대장 기록이랑 같아요. 10.5인치, 4.75. 1999년 8월 3일 원본이에요.'],
            ['seoha', '누가, 어떻게 여기까지 옮겼는지. 이제 보고서로 정리해요.']
          ] }
      ],
      confront: [
        { time: '23:20', place: '1층 로비', art: 'sceneLobby',
          lines: [
            ['seoha', '21시 47분 50초에 금고가 열렸어요. 그때 나간 국장님 목소리는 여섯 시에 녹음한 파일이었고요.'],
            ['ian', '국장실 전화도, 휴대전화도 받지 않으셨어요. 감사팀 기록이에요.'],
            ['seoha', '복도 불은 국장실 옆 동측 계단에서 꺼졌고, 자료실은 부조정실의 예비 카드로 열렸어요.'],
            ['seoha', '금고 번호를 아는 사람은 두 사람뿐인데, 민해수 씨는 그때 접수 창구에서 택배를 받고 있었어요.', { any: [{ found: 't_min_dial' }, { found: 's_procedure' }] }],
            ['seoha', '민해수 씨는 그때 접수 창구에서 택배를 받고 있었고, 한도윤 씨는 옥상에서 통화 중이었어요.', { not: { any: [{ found: 't_min_dial' }, { found: 's_procedure' }] } }],
            ['narr', '윤서진은 한참 동안 대답하지 않는다.'],
            ['yoon', '그 테이프에 내 목소리는 없어요. 경보가 나간 시각만 남아 있죠.'],
            ['yoon', '가짜 팩스가 한 번 왔던 달이었어요. 저수지에 확인 전화를 걸었는데 계속 통화 중이었어요. 그러다 36분이 지났어요.', { found: 's_1999memo' }],
            ['min', '그 시각을 02:07로 옮겨 붙인 건 저예요. 시킨 대로 했고, 원본만은 못 지웠어요.', { found: 's_editnote' }],
            ['han', '“확인될 때까지 내보내지 마.” 그날 토크백으로 들은 말이에요.', { found: 't_han_talkback' }],
            ['yoon', '…알아요. 나도 27년 동안 그 말을 들었어요.', { found: 't_han_talkback' }],
            ['narr', '한도윤은 아무 말 없이 고개를 돌린다.', { not: { found: 't_han_talkback' } }]
          ] },
        { time: '23:52', place: '1층 송출실', art: 'sceneMaster',
          lines: [
            ['ian', '자정까지 8분. 송신기를 끄면 해담FM은 끝나요.'],
            ['seoha', '이 릴, 어떻게 할까요?']
          ],
          choice: [
            { id: 'seal', label: '봉인해서 내일 감사팀에 넘긴다' },
            { id: 'air', label: '봉인하기 전에 02:41 구간을 마지막 송출로 내보낸다' }
          ] }
      ],
      ending_seal: [
        { time: '23:55', place: '1층 송출실', art: 'sceneMaster',
          lines: [
            ['ian', '봉인 번호 적었어요. 서하 씨도 서명해 주세요.'],
            ['narr', '23:55. 이안이 준비한 마지막 안내가 나간다. 자정, 송신기 출력이 0으로 떨어진다.'],
            ['seoha', '내일 아침 이 릴은 감사팀 손으로 가요. 기사는 제가 쓰고요.'],
            ['narr', '27년 전 사라질 뻔했던 36분이 봉인된 상자 안에서 아침을 기다린다.']
          ] }
      ],
      ending_air: [
        { time: '23:57', place: '1층 송출실', art: 'sceneMaster',
          lines: [
            ['ian', '데크에 걸었어요. 02:41 바로 앞이에요.'],
            ['narr', '23:57. 해담FM 98.7로 27년 전의 송출이 다시 나간다.'],
            ['radio', '“[경보음] 해담FM 긴급 방송입니다. 상곡저수지가 방류를 시작했습니다. 은하천 하류 주민과 야영객께서는 지금 바로 높은 곳으로 대피하십시오. 지금 시각, 새벽 두 시 사십일 분입니다.”'],
            ['narr', '00:00. 송신기 출력이 0으로 떨어진다. 이안이 릴을 상자에 넣고, 서하가 봉인 위에 서명한다.'],
            ['han', '…이제야 나갔네요.']
          ] }
      ]
    },

    endingTitle: '지워지지 않은 목소리',
    credits: '모든 인물·단체·사건은 허구입니다.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
