// 별지기의 서재 — 3D 방탈출의 순수 게임 규칙.
// 렌더링(Three.js)과 분리되어 있어 WebGL을 쓸 수 없는 환경의 텍스트 탐색 모드에서도 같은 규칙으로 진행됩니다.

export type EscapeMode = "relaxed" | "challenge";

export type ItemId = "brassKey" | "uvLight" | "journal" | "lens" | "fuse";

export type ViewId = "overview" | "desk" | "shelf" | "chest" | "painting" | "door" | "wall" | "telescope";

export type SfxKind =
  | "click"
  | "pickup"
  | "unlock"
  | "locked"
  | "error"
  | "drawer"
  | "dial"
  | "book"
  | "power"
  | "beep"
  | "success"
  | "door"
  | "reveal"
  | "hint"
  | "paper"
  | "lamp"
  | "spin";

export type EventTone = "info" | "success" | "error" | "discovery";

export type EscapeEvent = {
  id: number;
  text: string;
  sound: SfxKind;
  tone: EventTone;
  open?: "telescope" | "journal";
};

export type KeypadFeedback = { n: number; kind: "wrong" | "near" | "ok" };

export type EscapeFlags = {
  rugLifted: boolean;
  keyTaken: boolean;
  drawerOpen: boolean;
  drawerItemsTaken: boolean;
  uvOn: boolean;
  moonRevealed: boolean;
  chestDials: [number, number, number];
  chestOpen: boolean;
  lensTaken: boolean;
  lensInstalled: boolean;
  telescopeFound: boolean;
  bookPulls: number[];
  wrongBook: { index: number; n: number } | null;
  compartmentOpen: boolean;
  fuseTaken: boolean;
  powerOn: boolean;
  keypadEntry: string;
  keypad: KeypadFeedback | null;
  doorOpen: boolean;
  lampOn: boolean;
  globeSpins: number;
};

export type EscapeState = {
  version: 1;
  mode: EscapeMode;
  elapsedMs: number;
  inventory: ItemId[];
  journalPages: number;
  flags: EscapeFlags;
  hintLevels: number[];
  hintsUsed: number;
  wrongAttempts: number;
  lastProgressMs: number;
  nudgedStage: number;
  timeUpShown: boolean;
  event: EscapeEvent | null;
};

export type HotspotId =
  | "door"
  | "keypad"
  | "fuseBox"
  | "desk"
  | "drawer"
  | "drawerItems"
  | "lamp"
  | "globe"
  | "candles"
  | "bookshelf"
  | "book-0"
  | "book-1"
  | "book-2"
  | "book-3"
  | "book-4"
  | "compartment"
  | "chest"
  | "dial-0"
  | "dial-1"
  | "dial-2"
  | "lens"
  | "telescope"
  | "window"
  | "clock"
  | "moonPoster"
  | "painting"
  | "rug"
  | "brassKey"
  | "key-0"
  | "key-1"
  | "key-2"
  | "key-3"
  | "key-4"
  | "key-5"
  | "key-6"
  | "key-7"
  | "key-8"
  | "key-9"
  | "key-clear"
  | "key-enter";

export const CHALLENGE_LIMIT_MS = 30 * 60 * 1000;
export const FINAL_STAGE = 8;
export const STAGE_COUNT = 8;
export const DOOR_CODE = "2140";

export const MOON_PHASES = [
  { name: "삭", glyph: "●" },
  { name: "초승달", glyph: "☽" },
  { name: "상현달", glyph: "◐" },
  { name: "차오르는 달", glyph: "◔" },
  { name: "보름달", glyph: "○" },
  { name: "기우는 달", glyph: "◕" },
  { name: "하현달", glyph: "◑" },
  { name: "그믐달", glyph: "☾" },
] as const;

export const CHEST_ANSWER: [number, number, number] = [1, 4, 6];

export const BOOKS = [
  { name: "빨간 책", color: "빨강", hex: "#b3342f", symbol: "●" },
  { name: "금색 책", color: "금색", hex: "#d4a73a", symbol: "▲" },
  { name: "초록 책", color: "초록", hex: "#2f8a5b", symbol: "■" },
  { name: "파란 책", color: "파랑", hex: "#2f63c4", symbol: "◆" },
  { name: "보라 책", color: "보라", hex: "#8a4fc7", symbol: "★" },
] as const;

export const BOOK_ANSWER = [3, 0, 4, 1, 2];

export const ITEMS: Record<ItemId, { name: string; icon: string; description: string }> = {
  brassKey: {
    name: "황동 열쇠",
    icon: "🗝️",
    description: "손가락만 한 황동 열쇠. 작은 가구 자물쇠에 맞을 것 같다.",
  },
  uvLight: {
    name: "UV 손전등",
    icon: "🔦",
    description: "보랏빛 자외선을 비추는 손전등. 눌러서 켜고 끌 수 있다.",
  },
  journal: {
    name: "관측 일지",
    icon: "📔",
    description: "한별 교수의 관측 일지. 눌러서 읽을 수 있다.",
  },
  lens: {
    name: "접안렌즈",
    icon: "🔭",
    description: "황동 테두리의 망원경 접안렌즈.",
  },
  fuse: {
    name: "유리 퓨즈",
    icon: "🧯",
    description: "구리 단자가 달린 유리관 퓨즈. 전기 장치에 끼우는 부품이다.",
  },
};

export const JOURNAL_PAGES = [
  {
    title: "관측 일지 — 마지막 기록",
    body: [
      "나를 찾으러 올 사람에게.",
      "이 방의 길은 모두 이어져 있다네. 눈에 보이는 것이 전부는 아니지.",
      "어떤 글씨는 보랏빛 아래에서만 깨어난다.",
      "달은 세 번 모습을 바꾸고서야 상자를 열어 줄 걸세.",
      "— 한별",
    ],
  },
  {
    title: "관측 일지 — 떠나는 날",
    body: [
      "불이 들어오면 문도 깨어날 걸세.",
      "내가 이 방을 떠난 순간, 벽의 시계도 함께 멈췄다네. 문은 그 시각을 기억하지.",
      "잊지 말게. 별지기의 시계는 스물네 시간을 센다네.",
      "— 한별",
    ],
  },
] as const;

export const STAGE_TITLES = [
  "사라진 열쇠 찾기",
  "잠긴 서랍 열기",
  "보이지 않는 글씨 찾기",
  "달의 궤짝 열기",
  "망원경으로 별자리 찾기",
  "책장의 순서 맞추기",
  "전원 되살리기",
  "문이 기억하는 시각",
  "탈출 성공",
];

export const HINTS: string[][] = [
  [
    "문을 열 도구가 어딘가 떨어져 있을지도 몰라요. 바닥을 천천히 둘러보세요.",
    "방 한가운데 러그의 한쪽 모서리가 살짝 들려 있어요.",
    "러그의 들린 모서리를 눌러 들춘 뒤, 드러난 황동 열쇠를 주우세요.",
  ],
  [
    "황동 열쇠가 맞는 작은 자물쇠를 찾아보세요. 열쇠 구멍이 있는 가구가 있어요.",
    "서쪽 벽 책상 서랍에 작은 열쇠 구멍이 있어요.",
    "열쇠를 가진 채 책상 서랍을 누르면 열려요. 안의 물건도 챙기세요.",
  ],
  [
    "일지를 다시 읽어 보세요. '보랏빛 아래에서만 깨어나는 글씨'는 무엇일까요?",
    "소지품의 UV 손전등을 켜고 벽에 걸린 그림과 포스터를 비춰 보세요.",
    "책상 위 벽의 '달의 위상' 포스터를 UV 손전등으로 비추면 숫자가 떠올라요.",
  ],
  [
    "떠오른 ①②③은 순서예요. 같은 달 기호를 쓰는 잠금장치가 있어요.",
    "책장 옆 궤짝의 다이얼 세 개에 달 모양이 새겨져 있어요.",
    "궤짝 다이얼을 왼쪽부터 초승달 → 보름달 → 하현달로 맞추세요.",
  ],
  [
    "궤짝에서 얻은 렌즈는 무언가를 '들여다보는' 도구예요.",
    "창가 망원경에 접안렌즈가 빠져 있어요. 렌즈를 가진 채 망원경을 누르세요.",
    "망원경을 들여다보고 화면을 끌어 색깔 별들이 선으로 이어진 별자리를 찾으세요.",
  ],
  [
    "망원경 속 별 색깔을 기억하나요? 같은 색이 방 안에 나란히 꽂혀 있어요.",
    "액자 속 성도에 적힌 말처럼, 가장 밝은 별에서 시작해 선을 따라 책을 당겨 보세요.",
    "책을 파랑 → 빨강 → 보라 → 금색 → 초록 순서로 당기세요.",
  ],
  [
    "퓨즈는 전기가 끊긴 곳에 필요해요. 꺼져 있는 장치를 떠올려 보세요.",
    "문 오른쪽 벽의 퓨즈함에 빈 슬롯이 하나 있어요.",
    "퓨즈를 가진 채 문 옆 퓨즈함을 누르세요.",
  ],
  [
    "일지의 마지막 장을 다시 읽어 보세요. 교수가 떠난 '시각'은 방 안에 멈춰 있어요.",
    "멈춘 벽시계는 9시 40분이에요. 그런데 창밖은 낮일까요, 밤일까요?",
    "별지기의 시계는 24시간제예요. 밤 9시 40분, 도어락에 2140을 입력하세요.",
  ],
  ["문이 열렸어요. 수고했어요!"],
];

export function stageOf(state: EscapeState): number {
  const f = state.flags;
  if (f.doorOpen) return 8;
  if (f.powerOn) return 7;
  if (f.fuseTaken || f.compartmentOpen) return 6;
  if (f.telescopeFound) return 5;
  if (f.chestOpen) return 4;
  if (f.moonRevealed) return 3;
  if (f.drawerItemsTaken) return 2;
  if (f.keyTaken) return 1;
  return 0;
}

export function createInitialState(mode: EscapeMode = "relaxed"): EscapeState {
  return {
    version: 1,
    mode,
    elapsedMs: 0,
    inventory: [],
    journalPages: 0,
    flags: {
      rugLifted: false,
      keyTaken: false,
      drawerOpen: false,
      drawerItemsTaken: false,
      uvOn: false,
      moonRevealed: false,
      chestDials: [0, 0, 0],
      chestOpen: false,
      lensTaken: false,
      lensInstalled: false,
      telescopeFound: false,
      bookPulls: [],
      wrongBook: null,
      compartmentOpen: false,
      fuseTaken: false,
      powerOn: false,
      keypadEntry: "",
      keypad: null,
      doorOpen: false,
      lampOn: true,
      globeSpins: 0,
    },
    hintLevels: Array.from({ length: FINAL_STAGE + 1 }, () => 0),
    hintsUsed: 0,
    wrongAttempts: 0,
    lastProgressMs: 0,
    nudgedStage: -1,
    timeUpShown: false,
    event: null,
  };
}

export type EscapeAction =
  | { type: "interact"; hotspot: HotspotId }
  | { type: "useItem"; item: ItemId }
  | { type: "revealMoon" }
  | { type: "telescopeFound" }
  | { type: "hint" }
  | { type: "tick"; deltaMs: number }
  | { type: "nudged" }
  | { type: "timeUpShown" }
  | { type: "setMode"; mode: EscapeMode }
  | { type: "reset"; mode: EscapeMode }
  | { type: "restore"; state: EscapeState };

function withEvent(
  state: EscapeState,
  text: string,
  sound: SfxKind,
  tone: EventTone = "info",
  open?: EscapeEvent["open"],
): EscapeState {
  return { ...state, event: { id: (state.event?.id ?? 0) + 1, text, sound, tone, open } };
}

function setFlags(state: EscapeState, patch: Partial<EscapeFlags>): EscapeState {
  return { ...state, flags: { ...state.flags, ...patch } };
}

const has = (state: EscapeState, item: ItemId) => state.inventory.includes(item);
const removeItem = (inventory: ItemId[], item: ItemId) => inventory.filter((entry) => entry !== item);

function pressKey(state: EscapeState, key: string): EscapeState {
  const f = state.flags;
  if (f.doorOpen) return withEvent(state, "문은 이미 열려 있다.", "click");
  if (!f.powerOn) return withEvent(state, "버튼을 눌러도 반응이 없다. 도어락에 전원이 들어오지 않는다.", "locked", "error");

  if (key === "clear") {
    return withEvent(setFlags(state, { keypadEntry: "", keypad: null }), "입력을 지웠다.", "beep");
  }
  if (key === "enter") {
    if (f.keypadEntry.length < 4) {
      return withEvent(state, "네 자리를 모두 입력해야 한다.", "error", "error");
    }
    return checkCode(state, f.keypadEntry);
  }

  const entry = `${f.keypadEntry}${key}`.slice(0, 4);
  const next = setFlags(state, { keypadEntry: entry });
  if (entry.length === 4) return checkCode(next, entry);
  return withEvent(next, `도어락: ${entry.padEnd(4, "·")}`, "beep");
}

function checkCode(state: EscapeState, entry: string): EscapeState {
  const n = (state.flags.keypad?.n ?? 0) + 1;
  if (entry === DOOR_CODE) {
    return withEvent(
      setFlags(state, { keypadEntry: entry, keypad: { n, kind: "ok" }, doorOpen: true }),
      "띠리릭— 잠금이 풀렸다! 무거운 문이 천천히 열린다.",
      "door",
      "success",
    );
  }
  const near = entry === "0940" || entry === "9400" || entry === "4021";
  return withEvent(
    {
      ...setFlags(state, { keypadEntry: "", keypad: { n, kind: near ? "near" : "wrong" } }),
      wrongAttempts: state.wrongAttempts + 1,
    },
    near
      ? "삐빅— 틀렸다. 그런데 숫자 자체는 맞다는 듯 표시등이 노랗게 한 번 깜빡였다."
      : "삐빅— 틀린 번호다. 표시등이 붉게 깜빡였다.",
    "error",
    "error",
  );
}

function interact(state: EscapeState, hotspot: HotspotId): EscapeState {
  const f = state.flags;

  if (hotspot.startsWith("key-")) return pressKey(state, hotspot.slice(4));

  if (hotspot.startsWith("book-")) {
    const index = Number(hotspot.slice(5));
    if (f.compartmentOpen) return withEvent(state, "책들이 모두 당겨진 채 고정되어 있다.", "click");
    if (f.bookPulls.includes(index)) return withEvent(state, `${BOOKS[index].name}은 이미 당겨져 있다.`, "click");
    const pulls = [...f.bookPulls, index];
    const correctPrefix = pulls.every((value, i) => BOOK_ANSWER[i] === value);
    if (!correctPrefix) {
      return withEvent(
        {
          ...setFlags(state, {
            bookPulls: [],
            wrongBook: { index, n: (f.wrongBook?.n ?? 0) + 1 },
          }),
          wrongAttempts: state.wrongAttempts + 1,
        },
        `${BOOKS[index].name}을 당기자 철컥— 당겨 둔 책들이 모두 제자리로 돌아갔다.`,
        "locked",
        "error",
      );
    }
    if (pulls.length === BOOK_ANSWER.length) {
      return withEvent(
        setFlags(state, { bookPulls: pulls, compartmentOpen: true }),
        "마지막 책을 당기자 책장 아래 비밀 칸이 스르륵 열렸다!",
        "unlock",
        "success",
      );
    }
    return withEvent(setFlags(state, { bookPulls: pulls }), `${BOOKS[index].name}이 딸깍 소리를 내며 반쯤 빠져나왔다.`, "book");
  }

  if (hotspot.startsWith("dial-")) {
    const index = Number(hotspot.slice(5));
    if (f.chestOpen) return withEvent(state, "궤짝은 이미 열려 있다.", "click");
    const dials = [...f.chestDials] as [number, number, number];
    dials[index] = (dials[index] + 1) % MOON_PHASES.length;
    const solved = dials.every((value, i) => value === CHEST_ANSWER[i]);
    const next = setFlags(state, { chestDials: dials, chestOpen: solved });
    if (solved) {
      return withEvent(next, "달이 세 번 모습을 바꾸자 궤짝 자물쇠가 철컥 풀렸다!", "unlock", "success");
    }
    return withEvent(next, `${index + 1}번 다이얼: ${MOON_PHASES[dials[index]].name}`, "dial");
  }

  switch (hotspot) {
    case "rug":
      if (f.keyTaken) return withEvent(state, "낡은 페르시안 러그. 더는 숨겨진 것이 없다.", "click");
      if (f.rugLifted) return withEvent(state, "들춘 모서리 아래 작은 황동 열쇠가 반짝인다.", "click");
      return withEvent(setFlags(state, { rugLifted: true }), "들린 러그 모서리를 젖히자 무언가 반짝인다!", "paper", "discovery");
    case "brassKey":
      if (!f.rugLifted || f.keyTaken) return state;
      return withEvent(
        { ...setFlags(state, { keyTaken: true }), inventory: [...state.inventory, "brassKey"] },
        "황동 열쇠를 주웠다.",
        "pickup",
        "success",
      );
    case "desk":
      return withEvent(state, "오래된 참나무 책상. 서랍 앞면에 작은 열쇠 구멍이 있다.", "click");
    case "drawer":
      if (f.drawerOpen) {
        return f.drawerItemsTaken
          ? withEvent(state, "서랍은 비어 있다.", "click")
          : withEvent(state, "서랍 안에 손전등과 가죽 일지가 있다.", "click");
      }
      if (has(state, "brassKey")) {
        return withEvent(
          { ...setFlags(state, { drawerOpen: true }), inventory: removeItem(state.inventory, "brassKey") },
          "황동 열쇠를 꽂아 돌리자 서랍이 스르륵 열렸다.",
          "drawer",
          "success",
        );
      }
      return withEvent(state, "잠겨 있다. 작은 열쇠 구멍이 보인다.", "locked", "error");
    case "drawerItems":
      if (!f.drawerOpen || f.drawerItemsTaken) return state;
      return withEvent(
        {
          ...setFlags(state, { drawerItemsTaken: true }),
          inventory: [...state.inventory, "uvLight", "journal"],
          journalPages: Math.max(state.journalPages, 1),
        },
        "UV 손전등과 관측 일지를 챙겼다. 일지는 소지품에서 읽을 수 있다.",
        "pickup",
        "success",
        "journal",
      );
    case "lamp":
      return withEvent(
        setFlags(state, { lampOn: !f.lampOn }),
        f.lampOn ? "스탠드를 껐다. 방이 더 어두워졌다." : "스탠드를 켰다. 녹색 갓 아래로 따뜻한 빛이 번진다.",
        "lamp",
      );
    case "globe":
      return withEvent(
        setFlags(state, { globeSpins: f.globeSpins + 1 }),
        "지구본이 빙그르르 돈다. 한반도 위에 누군가 작은 별을 그려 두었다.",
        "spin",
      );
    case "candles":
      return withEvent(state, "촛불이 조용히 흔들린다. 불을 붙인 지 오래되지 않은 것 같다.", "click");
    case "bookshelf":
      return withEvent(
        state,
        "천문학 서적이 빼곡하다. 가운데 칸에 유난히 선명한 색의 책 다섯 권이 꽂혀 있다.",
        "click",
      );
    case "compartment":
      if (!f.compartmentOpen) {
        return withEvent(state, "책장 맨 아래 칸의 판자가 다른 곳보다 새것 같다.", "click");
      }
      if (f.fuseTaken) return withEvent(state, "비밀 칸은 비어 있다.", "click");
      return withEvent(
        {
          ...setFlags(state, { fuseTaken: true }),
          inventory: [...state.inventory, "fuse"],
          journalPages: 2,
        },
        "비밀 칸에서 유리 퓨즈와 일지의 마지막 장을 찾았다.",
        "pickup",
        "success",
        "journal",
      );
    case "chest":
      if (f.chestOpen) {
        return f.lensTaken
          ? withEvent(state, "궤짝은 비어 있다.", "click")
          : withEvent(state, "궤짝 안 벨벳 위에 황동 접안렌즈가 놓여 있다.", "click");
      }
      return withEvent(state, "달 모양 다이얼 세 개로 잠긴 궤짝. 다이얼을 눌러 돌릴 수 있다.", "click");
    case "lens":
      if (!f.chestOpen || f.lensTaken) return state;
      return withEvent(
        { ...setFlags(state, { lensTaken: true }), inventory: [...state.inventory, "lens"] },
        "황동 접안렌즈를 챙겼다.",
        "pickup",
        "success",
      );
    case "telescope":
      if (f.lensInstalled) {
        return withEvent(state, "망원경을 들여다본다.", "click", "info", "telescope");
      }
      if (has(state, "lens")) {
        return withEvent(
          {
            ...setFlags(state, { lensInstalled: true }),
            inventory: removeItem(state.inventory, "lens"),
          },
          "접안렌즈를 끼웠다. 이제 망원경을 들여다볼 수 있다.",
          "unlock",
          "success",
          "telescope",
        );
      }
      return withEvent(state, "창밖을 향한 황동 망원경. 접안렌즈가 빠져 있어 들여다볼 수 없다.", "locked", "error");
    case "window":
      return withEvent(state, "둥근 창 너머로 보름달이 높이 떠 있다. 깊은 밤이다.", "click");
    case "clock":
      return withEvent(state, "벽시계가 9시 40분에 멈춰 있다. 초침은 미동도 없다.", "click");
    case "moonPoster":
      if (f.moonRevealed) {
        return withEvent(
          state,
          "여덟 가지 달 가운데 세 개 옆에 숫자가 떠올라 있다: ① 초승달 ② 보름달 ③ 하현달.",
          "click",
          "discovery",
        );
      }
      if (f.uvOn) return reveal(state);
      return withEvent(state, "여덟 가지 달의 모양을 그린 오래된 포스터. 삭부터 그믐달까지 순서대로 그려져 있다.", "click");
    case "painting":
      return withEvent(
        state,
        "액자 속 성도(星圖). 아래에 금빛 글씨로 '가장 밝은 별에서 시작해, 선을 따라 이야기를 읽어라'라고 적혀 있다.",
        "click",
      );
    case "door":
      if (f.doorOpen) return withEvent(state, "문이 열려 있다. 밖으로 나가자!", "click");
      return withEvent(
        state,
        f.powerOn
          ? "도어락이 깨어났다. 네 자리 숫자를 기다린다."
          : "무거운 참나무 문. 옆의 전자 도어락 화면이 꺼져 있다.",
        "locked",
      );
    case "keypad":
      return withEvent(
        state,
        f.powerOn ? "숫자 네 자리를 누르면 확인된다." : "도어락 화면이 꺼져 있다. 전원이 필요해 보인다.",
        "click",
      );
    case "fuseBox":
      if (f.powerOn) return withEvent(state, "퓨즈함 표시등이 초록색으로 빛난다.", "click");
      if (has(state, "fuse")) {
        return withEvent(
          { ...setFlags(state, { powerOn: true }), inventory: removeItem(state.inventory, "fuse") },
          "퓨즈를 끼우자 웅— 하는 소리와 함께 방 안에 불이 들어왔다!",
          "power",
          "success",
        );
      }
      return withEvent(state, "퓨즈함. 세 개의 슬롯 중 하나가 비어 있다.", "locked", "error");
    default:
      return state;
  }
}

function reveal(state: EscapeState): EscapeState {
  if (state.flags.moonRevealed) return state;
  return withEvent(
    setFlags(state, { moonRevealed: true }),
    "보랏빛 아래 포스터에 숫자가 떠올랐다: ① 초승달 ② 보름달 ③ 하현달.",
    "reveal",
    "discovery",
  );
}

function trackProgress(previous: EscapeState, next: EscapeState): EscapeState {
  if (stageOf(next) > stageOf(previous)) return { ...next, lastProgressMs: next.elapsedMs };
  return next;
}

export function escapeReducer(state: EscapeState, action: EscapeAction): EscapeState {
  switch (action.type) {
    case "interact":
      return trackProgress(state, interact(state, action.hotspot));
    case "useItem": {
      if (!has(state, action.item)) return state;
      if (action.item === "uvLight") {
        const on = !state.flags.uvOn;
        return withEvent(
          setFlags(state, { uvOn: on }),
          on ? "UV 손전등을 켰다. 보랏빛이 닿는 곳을 살펴보자." : "UV 손전등을 껐다.",
          "lamp",
        );
      }
      if (action.item === "journal") {
        return withEvent(state, "관측 일지를 펼쳤다.", "paper", "info", "journal");
      }
      const item = ITEMS[action.item];
      return withEvent(state, `${item.name}: ${item.description}`, "click");
    }
    case "revealMoon":
      return trackProgress(state, reveal(state));
    case "telescopeFound":
      if (state.flags.telescopeFound) return state;
      return trackProgress(
        state,
        withEvent(
          setFlags(state, { telescopeFound: true }),
          "다섯 개의 색깔 별이 선으로 이어진 별자리를 찾았다! 가장 밝은 파란 별에서 선이 시작된다.",
          "reveal",
          "discovery",
        ),
      );
    case "hint": {
      const stage = stageOf(state);
      const hints = HINTS[stage];
      const level = state.hintLevels[stage] ?? 0;
      if (level >= hints.length) return state;
      const hintLevels = state.hintLevels.slice();
      hintLevels[stage] = level + 1;
      return withEvent(
        { ...state, hintLevels, hintsUsed: state.hintsUsed + 1 },
        `별지기의 메모 ${level + 1}: ${hints[level]}`,
        "hint",
      );
    }
    case "tick":
      if (state.flags.doorOpen) return state;
      return { ...state, elapsedMs: state.elapsedMs + Math.max(0, Math.min(action.deltaMs, 5000)) };
    case "nudged":
      return { ...state, nudgedStage: stageOf(state) };
    case "timeUpShown":
      return { ...state, timeUpShown: true };
    case "setMode":
      return { ...state, mode: action.mode };
    case "reset":
      return { ...createInitialState(action.mode), event: null };
    case "restore":
      return { ...action.state, event: null };
    default:
      return state;
  }
}

const ITEM_IDS: ItemId[] = ["brassKey", "uvLight", "journal", "lens", "fuse"];

export function isEscapeState(value: unknown): value is EscapeState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<EscapeState>;
  const flags = state.flags as Partial<EscapeFlags> | undefined;
  return (
    state.version === 1 &&
    (state.mode === "relaxed" || state.mode === "challenge") &&
    typeof state.elapsedMs === "number" &&
    Number.isFinite(state.elapsedMs) &&
    Array.isArray(state.inventory) &&
    state.inventory.every((item) => ITEM_IDS.includes(item as ItemId)) &&
    typeof state.journalPages === "number" &&
    Array.isArray(state.hintLevels) &&
    state.hintLevels.length === FINAL_STAGE + 1 &&
    typeof state.hintsUsed === "number" &&
    typeof state.wrongAttempts === "number" &&
    typeof state.lastProgressMs === "number" &&
    typeof state.nudgedStage === "number" &&
    typeof state.timeUpShown === "boolean" &&
    !!flags &&
    Array.isArray(flags.chestDials) &&
    flags.chestDials.length === 3 &&
    flags.chestDials.every((value) => Number.isInteger(value) && value >= 0 && value < MOON_PHASES.length) &&
    Array.isArray(flags.bookPulls) &&
    flags.bookPulls.every((value) => Number.isInteger(value) && value >= 0 && value < BOOKS.length) &&
    typeof flags.keypadEntry === "string" &&
    typeof flags.doorOpen === "boolean" &&
    typeof flags.powerOn === "boolean" &&
    typeof flags.rugLifted === "boolean" &&
    typeof flags.lampOn === "boolean"
  );
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function rankFor(state: EscapeState) {
  if (state.hintsUsed === 0 && state.wrongAttempts <= 2) return "전설의 별지기";
  if (state.hintsUsed <= 3) return "노련한 천문학자";
  if (state.hintsUsed <= 8) return "호기심 많은 조수";
  return "끈기 있는 탐험가";
}

export type HotspotDef = {
  id: HotspotId;
  label: string;
  // 이 핫스팟을 누르면 카메라가 이동할 시점
  view?: ViewId;
  // 이 핫스팟을 직접 조작할 수 있는 시점. 없으면 모든 시점에서 가능
  within?: ViewId[];
  // 접근성 탐색 목록에서 묶어 보여줄 장소
  area?: ViewId;
  visible?: (state: EscapeState) => boolean;
};

const KEY_LABELS: Record<string, string> = { clear: "지우기", enter: "확인" };

export const HOTSPOTS: HotspotDef[] = [
  { id: "door", label: "잠긴 문", view: "door" },
  { id: "keypad", label: "전자 도어락", view: "door" },
  { id: "fuseBox", label: "퓨즈함", view: "door" },
  ...(["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"] as const).map(
    (key): HotspotDef => ({
      id: `key-${key}` as HotspotId,
      label: `도어락 ${KEY_LABELS[key] ?? key}`,
      within: ["door"],
    }),
  ),
  { id: "clock", label: "멈춘 벽시계", view: "wall" },
  { id: "desk", label: "참나무 책상", view: "desk" },
  { id: "drawer", label: "책상 서랍", view: "desk", within: ["desk"] },
  {
    id: "drawerItems",
    label: "서랍 속 손전등과 일지",
    within: ["desk"],
    visible: (s) => s.flags.drawerOpen && !s.flags.drawerItemsTaken,
  },
  { id: "moonPoster", label: "달의 위상 포스터", view: "desk" },
  { id: "lamp", label: "녹색 갓 스탠드", area: "desk" },
  { id: "globe", label: "지구본", area: "desk" },
  { id: "candles", label: "촛대", area: "wall" },
  { id: "bookshelf", label: "책장", view: "shelf" },
  ...BOOKS.map(
    (book, index): HotspotDef => ({
      id: `book-${index}` as HotspotId,
      label: `${book.name} (${book.symbol})`,
      within: ["shelf"],
    }),
  ),
  { id: "compartment", label: "책장 아래 칸", within: ["shelf"] },
  { id: "chest", label: "달의 궤짝", view: "chest" },
  ...[0, 1, 2].map(
    (index): HotspotDef => ({
      id: `dial-${index}` as HotspotId,
      label: `${index + 1}번 달 다이얼`,
      within: ["chest"],
      visible: (s) => !s.flags.chestOpen,
    }),
  ),
  {
    id: "lens",
    label: "궤짝 속 접안렌즈",
    within: ["chest"],
    visible: (s) => s.flags.chestOpen && !s.flags.lensTaken,
  },
  { id: "painting", label: "성도 액자", view: "painting" },
  { id: "telescope", label: "황동 망원경", view: "telescope" },
  { id: "window", label: "둥근 창", view: "telescope" },
  { id: "rug", label: "페르시안 러그", area: "overview" },
  {
    id: "brassKey",
    label: "러그 아래 황동 열쇠",
    area: "overview",
    visible: (s) => s.flags.rugLifted && !s.flags.keyTaken,
  },
];

export const HOTSPOT_BY_ID = new Map(HOTSPOTS.map((hotspot) => [hotspot.id, hotspot]));

export function hotspotLabel(id: HotspotId, state: EscapeState) {
  if (id.startsWith("dial-")) {
    const index = Number(id.slice(5));
    return `${index + 1}번 다이얼 (현재 ${MOON_PHASES[state.flags.chestDials[index]].name})`;
  }
  if (id.startsWith("book-")) {
    const index = Number(id.slice(5));
    const pulled = state.flags.bookPulls.includes(index);
    return `${HOTSPOT_BY_ID.get(id)?.label ?? id}${pulled ? " — 당겨짐" : ""}`;
  }
  return HOTSPOT_BY_ID.get(id)?.label ?? id;
}

export function isHotspotAvailable(def: HotspotDef, view: ViewId, state: EscapeState) {
  if (def.visible && !def.visible(state)) return false;
  if (def.within && !def.within.includes(view)) return false;
  return true;
}

export function listHotspots(view: ViewId, state: EscapeState) {
  return HOTSPOTS.filter((def) => {
    if (def.id.startsWith("key-")) return false;
    if (!isHotspotAvailable(def, view, state)) return false;
    if (view === "overview") return !def.within;
    return (def.view ?? def.area ?? def.within?.[0]) === view;
  });
}

export const KEYPAD_ORDER: HotspotId[] = [
  "key-1",
  "key-2",
  "key-3",
  "key-4",
  "key-5",
  "key-6",
  "key-7",
  "key-8",
  "key-9",
  "key-clear",
  "key-0",
  "key-enter",
];

export const VIEW_LABELS: Record<ViewId, string> = {
  overview: "서재 전체",
  desk: "책상과 달 포스터",
  shelf: "책장",
  chest: "달의 궤짝",
  painting: "성도 액자",
  door: "문과 도어락",
  wall: "벽시계",
  telescope: "창가 망원경",
};
