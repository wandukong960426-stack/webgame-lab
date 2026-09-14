"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import { trackGameEvent } from "@/lib/telemetry";

type Color = "blue" | "red";
type PieceType = "general" | "guard" | "elephant" | "horse" | "chariot" | "cannon" | "soldier";
type Piece = { type: PieceType; color: Color };
type Square = Piece | null;
type Board = Square[][];
type Coord = { row: number; col: number };
type Move = { from: Coord; to: Coord };
type Mode = "ai" | "2p";
type Result = Color | "draw" | null;
type Snapshot = { board: Board; turn: Color; result: Result; notice: string };

const ROWS = 10;
const COLS = 9;
const other = (color: Color): Color => color === "blue" ? "red" : "blue";
const inside = (row: number, col: number) => row >= 0 && row < ROWS && col >= 0 && col < COLS;
const coordKey = (row: number, col: number) => `${row},${col}`;

const labels: Record<Color, Record<PieceType, string>> = {
  blue: { general: "楚", guard: "士", elephant: "象", horse: "馬", chariot: "車", cannon: "包", soldier: "卒" },
  red: { general: "漢", guard: "士", elephant: "象", horse: "馬", chariot: "車", cannon: "砲", soldier: "兵" },
};

const names: Record<PieceType, string> = {
  general: "장", guard: "사", elephant: "상", horse: "마", chariot: "차", cannon: "포", soldier: "졸/병",
};

const values: Record<PieceType, number> = {
  general: 1000, guard: 3, elephant: 3, horse: 5, chariot: 13, cannon: 7, soldier: 2,
};

const palaceLines: Coord[][] = [
  [{ row: 0, col: 3 }, { row: 1, col: 4 }, { row: 2, col: 5 }],
  [{ row: 0, col: 5 }, { row: 1, col: 4 }, { row: 2, col: 3 }],
  [{ row: 7, col: 3 }, { row: 8, col: 4 }, { row: 9, col: 5 }],
  [{ row: 7, col: 5 }, { row: 8, col: 4 }, { row: 9, col: 3 }],
];

function makePiece(type: PieceType, color: Color): Piece {
  return { type, color };
}

function initialBoard(): Board {
  const board = Array.from({ length: ROWS }, () => Array<Square>(COLS).fill(null));
  const order: PieceType[] = ["chariot", "elephant", "horse", "guard", "general", "guard", "horse", "elephant", "chariot"];
  board[0] = order.map((type) => makePiece(type, "red"));
  board[9] = order.map((type) => makePiece(type, "blue"));
  board[2][1] = makePiece("cannon", "red");
  board[2][7] = makePiece("cannon", "red");
  board[7][1] = makePiece("cannon", "blue");
  board[7][7] = makePiece("cannon", "blue");
  for (const col of [0, 2, 4, 6, 8]) {
    board[3][col] = makePiece("soldier", "red");
    board[6][col] = makePiece("soldier", "blue");
  }
  return board;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((piece) => piece ? { ...piece } : null));
}

function ownPalace(color: Color, row: number, col: number) {
  return col >= 3 && col <= 5 && (color === "red" ? row >= 0 && row <= 2 : row >= 7 && row <= 9);
}

function palaceAdjacent(from: Coord, to: Coord) {
  if (Math.abs(from.row - to.row) + Math.abs(from.col - to.col) === 1) {
    const inTop = from.row <= 2 && to.row <= 2 && from.col >= 3 && from.col <= 5 && to.col >= 3 && to.col <= 5;
    const inBottom = from.row >= 7 && to.row >= 7 && from.col >= 3 && from.col <= 5 && to.col >= 3 && to.col <= 5;
    if (inTop || inBottom) return true;
  }
  return palaceLines.some((line) => {
    const fromIndex = line.findIndex((point) => point.row === from.row && point.col === from.col);
    const toIndex = line.findIndex((point) => point.row === to.row && point.col === to.col);
    return fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1;
  });
}

function palaceRays(from: Coord) {
  const rays: Coord[][] = [];
  for (const line of palaceLines) {
    const index = line.findIndex((point) => point.row === from.row && point.col === from.col);
    if (index < 0) continue;
    if (index > 0) rays.push(line.slice(0, index).reverse());
    if (index < line.length - 1) rays.push(line.slice(index + 1));
  }
  return rays;
}

function findGeneral(board: Board, color: Color): Coord | null {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = board[row][col];
      if (piece?.type === "general" && piece.color === color) return { row, col };
    }
  }
  return null;
}

function generalsFacing(board: Board) {
  const blue = findGeneral(board, "blue");
  const red = findGeneral(board, "red");
  if (!blue || !red || blue.col !== red.col) return false;
  const start = Math.min(blue.row, red.row) + 1;
  const end = Math.max(blue.row, red.row);
  for (let row = start; row < end; row += 1) {
    if (board[row][blue.col]) return false;
  }
  return true;
}

function pseudoMoves(board: Board, row: number, col: number, forAttack = false): Move[] {
  const piece = board[row][col];
  if (!piece) return [];
  const from = { row, col };
  const output = new Map<string, Move>();

  const add = (targetRow: number, targetCol: number) => {
    if (!inside(targetRow, targetCol)) return false;
    const target = board[targetRow][targetCol];
    if (!target) {
      output.set(coordKey(targetRow, targetCol), { from, to: { row: targetRow, col: targetCol } });
      return true;
    }
    if (target.color !== piece.color && (forAttack || target.type !== "general")) {
      output.set(coordKey(targetRow, targetCol), { from, to: { row: targetRow, col: targetCol } });
    }
    return false;
  };

  if (piece.type === "general" || piece.type === "guard") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        const target = { row: row + dr, col: col + dc };
        if (ownPalace(piece.color, target.row, target.col) && palaceAdjacent(from, target)) add(target.row, target.col);
      }
    }
  }

  if (piece.type === "soldier") {
    const direction = piece.color === "blue" ? -1 : 1;
    add(row + direction, col);
    add(row, col - 1);
    add(row, col + 1);
    for (const dc of [-1, 1]) {
      const target = { row: row + direction, col: col + dc };
      if (palaceAdjacent(from, target)) add(target.row, target.col);
    }
  }

  if (piece.type === "horse") {
    const patterns = [
      { block: [-1, 0], targets: [[-2, -1], [-2, 1]] },
      { block: [1, 0], targets: [[2, -1], [2, 1]] },
      { block: [0, -1], targets: [[-1, -2], [1, -2]] },
      { block: [0, 1], targets: [[-1, 2], [1, 2]] },
    ];
    for (const pattern of patterns) {
      const blockRow = row + pattern.block[0];
      const blockCol = col + pattern.block[1];
      if (!inside(blockRow, blockCol) || board[blockRow][blockCol]) continue;
      pattern.targets.forEach(([dr, dc]) => add(row + dr, col + dc));
    }
  }

  if (piece.type === "elephant") {
    const patterns = [
      [-1, 0, -2, -1, -3, -2], [-1, 0, -2, 1, -3, 2],
      [1, 0, 2, -1, 3, -2], [1, 0, 2, 1, 3, 2],
      [0, -1, -1, -2, -2, -3], [0, -1, 1, -2, 2, -3],
      [0, 1, -1, 2, -2, 3], [0, 1, 1, 2, 2, 3],
    ];
    for (const [b1r, b1c, b2r, b2c, tr, tc] of patterns) {
      const block1 = { row: row + b1r, col: col + b1c };
      const block2 = { row: row + b2r, col: col + b2c };
      if (!inside(block1.row, block1.col) || !inside(block2.row, block2.col)) continue;
      if (board[block1.row][block1.col] || board[block2.row][block2.col]) continue;
      add(row + tr, col + tc);
    }
  }

  if (piece.type === "chariot") {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      let targetRow = row + dr;
      let targetCol = col + dc;
      while (inside(targetRow, targetCol)) {
        const keepGoing = add(targetRow, targetCol);
        if (!keepGoing) break;
        targetRow += dr;
        targetCol += dc;
      }
    }
    for (const ray of palaceRays(from)) {
      for (const target of ray) {
        const keepGoing = add(target.row, target.col);
        if (!keepGoing) break;
      }
    }
  }

  if (piece.type === "cannon") {
    const processRay = (ray: Coord[]) => {
      let screenFound = false;
      for (const target of ray) {
        const occupant = board[target.row][target.col];
        if (!screenFound) {
          if (!occupant) continue;
          if (occupant.type === "cannon") break;
          screenFound = true;
          continue;
        }
        if (!occupant) {
          output.set(coordKey(target.row, target.col), { from, to: target });
          continue;
        }
        if (occupant.type !== "cannon" && occupant.color !== piece.color && (forAttack || occupant.type !== "general")) {
          output.set(coordKey(target.row, target.col), { from, to: target });
        }
        break;
      }
    };

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ray: Coord[] = [];
      let targetRow = row + dr;
      let targetCol = col + dc;
      while (inside(targetRow, targetCol)) {
        ray.push({ row: targetRow, col: targetCol });
        targetRow += dr;
        targetCol += dc;
      }
      processRay(ray);
    }
    palaceRays(from).forEach(processRay);
  }

  return [...output.values()];
}

function applyMove(board: Board, move: Move) {
  const next = cloneBoard(board);
  const captured = next[move.to.row][move.to.col];
  next[move.to.row][move.to.col] = next[move.from.row][move.from.col];
  next[move.from.row][move.from.col] = null;
  return { board: next, captured };
}

function isInCheck(board: Board, color: Color) {
  const general = findGeneral(board, color);
  if (!general) return true;
  if (generalsFacing(board)) return true;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = board[row][col];
      if (piece?.color !== other(color)) continue;
      if (pseudoMoves(board, row, col, true).some((move) => move.to.row === general.row && move.to.col === general.col)) return true;
    }
  }
  return false;
}

function legalMovesForPiece(board: Board, row: number, col: number) {
  const piece = board[row][col];
  if (!piece) return [];
  return pseudoMoves(board, row, col).filter((move) => !isInCheck(applyMove(board, move).board, piece.color));
}

function allLegalMoves(board: Board, color: Color) {
  const moves: Move[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col]?.color === color) moves.push(...legalMovesForPiece(board, row, col));
    }
  }
  return moves;
}

function evaluatePosition(board: Board, turn: Color) {
  const check = isInCheck(board, turn);
  const moves = allLegalMoves(board, turn);
  if (!moves.length && check) {
    const result = other(turn);
    return { result: result as Result, notice: `${result === "blue" ? "초(파랑)" : "한(빨강)"} 외통 승리!`, check };
  }
  if (!moves.length) {
    return { result: null as Result, notice: `${turn === "blue" ? "초" : "한"}이 둘 수 있는 수가 없어 한 수 쉼만 가능합니다.`, check };
  }
  return {
    result: null as Result,
    notice: check ? `${turn === "blue" ? "초" : "한"} 장군입니다! 반드시 장군을 피하세요.` : `${turn === "blue" ? "초(파랑)" : "한(빨강)"} 차례입니다.`,
    check,
  };
}

function chooseAiMove(board: Board) {
  const moves = allLegalMoves(board, "red");
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const target = board[move.to.row][move.to.col];
    const applied = applyMove(board, move).board;
    const givesCheck = isInCheck(applied, "blue");
    const center = 5 - (Math.abs(move.to.row - 4.5) + Math.abs(move.to.col - 4)) * 0.25;
    const score =
      (target ? values[target.type] * 12 : 0) +
      (givesCheck ? 10 : 0) +
      center +
      Math.random() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function BoardLines() {
  return (
    <svg className="janggi-lines" viewBox="0 0 8 9" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => <line key={`h${index}`} x1="0" y1={index} x2="8" y2={index} />)}
      {Array.from({ length: 9 }, (_, index) => <line key={`v${index}`} x1={index} y1="0" x2={index} y2="9" />)}
      <line x1="3" y1="0" x2="5" y2="2" />
      <line x1="5" y1="0" x2="3" y2="2" />
      <line x1="3" y1="7" x2="5" y2="9" />
      <line x1="5" y1="7" x2="3" y2="9" />
    </svg>
  );
}

export default function JanggiPage() {
  const { play } = useGameAudio();
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Color>("blue");
  const [mode, setMode] = useState<Mode>("ai");
  const [selected, setSelected] = useState<Coord | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [notice, setNotice] = useState("초(파랑) 차례입니다.");
  const [history, setHistory] = useState<Snapshot[]>([]);

  const pieces = useMemo(() => board.flat().reduce((acc, piece) => {
    if (piece?.color === "blue") acc.blue += 1;
    if (piece?.color === "red") acc.red += 1;
    return acc;
  }, { blue: 0, red: 0 }), [board]);
  const checkedGeneral = useMemo(() => isInCheck(board, turn) ? findGeneral(board, turn) : null, [board, turn]);
  const legalMap = useMemo(() => new Map(legal.map((move) => [coordKey(move.to.row, move.to.col), move])), [legal]);

  const reset = useCallback((nextMode = mode) => {
    setBoard(initialBoard());
    setTurn("blue");
    setSelected(null);
    setLegal([]);
    setResult(null);
    setNotice("초(파랑) 차례입니다.");
    setHistory([]);
    trackGameEvent("game_restart", "janggi", { mode: nextMode });
  }, [mode]);

  const performMove = useCallback((move: Move) => {
    if (result) return;
    const moving = board[move.from.row][move.from.col];
    if (!moving || moving.color !== turn) return;

    setHistory((items) => [...items, { board: cloneBoard(board), turn, result, notice }]);
    const applied = applyMove(board, move);
    const nextTurn = other(turn);
    const outcome = evaluatePosition(applied.board, nextTurn);

    setBoard(applied.board);
    setTurn(nextTurn);
    setSelected(null);
    setLegal([]);
    setResult(outcome.result);
    setNotice(outcome.notice);
    play(applied.captured ? "capture" : outcome.result ? "win" : "move");

    if (outcome.result) {
      if (mode === "ai" && outcome.result === "red") play("lose");
      trackGameEvent("game_end", "janggi", {
        result: outcome.result,
        mode,
        plies: history.length + 1,
      });
    }
  }, [board, history.length, mode, notice, play, result, turn]);

  const passTurn = useCallback(() => {
    if (result || isInCheck(board, turn)) {
      play("error");
      return;
    }
    setHistory((items) => [...items, { board: cloneBoard(board), turn, result, notice }]);
    const nextTurn = other(turn);
    const outcome = evaluatePosition(board, nextTurn);
    setTurn(nextTurn);
    setSelected(null);
    setLegal([]);
    setResult(outcome.result);
    setNotice(`${turn === "blue" ? "초" : "한"}가 한 수 쉬었습니다. ${outcome.notice}`);
    play("select");
  }, [board, notice, play, result, turn]);

  useEffect(() => {
    if (mode !== "ai" || turn !== "red" || result) return;
    const timer = window.setTimeout(() => {
      const move = chooseAiMove(board);
      if (move) performMove(move);
      else passTurn();
    }, 560);
    return () => window.clearTimeout(timer);
  }, [board, mode, passTurn, performMove, result, turn]);

  const selectSquare = (row: number, col: number) => {
    if (result || (mode === "ai" && turn === "red")) return;
    const move = legalMap.get(coordKey(row, col));
    if (selected && move) {
      performMove(move);
      return;
    }
    const piece = board[row][col];
    if (piece?.color === turn) {
      setSelected({ row, col });
      setLegal(legalMovesForPiece(board, row, col));
      play("select");
    } else {
      setSelected(null);
      setLegal([]);
    }
  };

  const undo = () => {
    if (!history.length) return;
    const steps = mode === "ai" && turn === "blue" && history.length >= 2 ? 2 : 1;
    const index = Math.max(0, history.length - steps);
    const snapshot = history[index];
    setBoard(cloneBoard(snapshot.board));
    setTurn(snapshot.turn);
    setResult(snapshot.result);
    setNotice(snapshot.notice);
    setSelected(null);
    setLegal([]);
    setHistory((items) => items.slice(0, index));
    play("select");
  };

  return (
    <GameShell
      slug="janggi"
      title="장기"
      kicker="궁성 위의 한 수"
      description="기물을 선택하면 갈 수 있는 교차점이 표시됩니다. 차·포·마·상의 길목과 장군을 읽어보세요."
      theme="ink"
      status={<span className="status-inline"><i className="status-dot" />{mode === "ai" && turn === "red" && !result ? "한(빨강)이 다음 수를 계산하는 중…" : notice}</span>}
      score={
        <>
          <div className="score-chip"><span>초 기물</span><strong>{pieces.blue}</strong></div>
          <div className="score-chip"><span>한 기물</span><strong>{pieces.red}</strong></div>
          <div className="score-chip"><span>진행 수</span><strong>{history.length}</strong></div>
        </>
      }
      actions={
        <>
          <div className="segmented full-row" aria-label="대전 방식">
            <button type="button" className={mode === "ai" ? "is-active" : ""} onClick={() => { setMode("ai"); reset("ai"); trackGameEvent("game_mode_change", "janggi", { mode: "ai" }); }}>AI 대전</button>
            <button type="button" className={mode === "2p" ? "is-active" : ""} onClick={() => { setMode("2p"); reset("2p"); trackGameEvent("game_mode_change", "janggi", { mode: "2p" }); }}>같은 기기 2인</button>
          </div>
          <button type="button" className="control-button control-button--primary" onClick={() => reset()}>새 대국</button>
          <button type="button" className="control-button" onClick={undo} disabled={!history.length}>한 수 무르기</button>
          <button type="button" className="control-button full-row" onClick={passTurn} disabled={Boolean(result) || isInCheck(board, turn) || (mode === "ai" && turn === "red")}>한 수 쉼</button>
        </>
      }
      rules={
        <ul>
          <li>마·상은 길목이 막히면 넘을 수 없고, 포는 다른 기물 하나를 넘어야 합니다.</li>
          <li>포는 포를 넘거나 잡을 수 없으며, 차·포는 궁성 대각선을 이용할 수 있습니다.</li>
          <li>두 장이 같은 세로줄에서 마주 보도록 두거나 장군을 방치할 수 없습니다.</li>
        </ul>
      }
      tip={<p>차의 열린 길을 만들고 포의 발판을 유지하세요. 마와 상 앞 한 칸이 막히면 이동 범위가 크게 줄어듭니다.</p>}
    >
      <div className="janggi-board" role="grid" aria-label="9×10 장기판">
        <BoardLines />
        <div className="janggi-grid">
          {board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
            const key = coordKey(rowIndex, colIndex);
            const move = legalMap.get(key);
            const isSelected = selected?.row === rowIndex && selected.col === colIndex;
            const isChecked = checkedGeneral?.row === rowIndex && checkedGeneral.col === colIndex;
            const classes = [
              "janggi-cell",
              isSelected ? "selected" : "",
              move ? "legal" : "",
              move && piece ? "capture-target" : "",
              isChecked ? "in-check" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                type="button"
                role="gridcell"
                className={classes}
                key={key}
                aria-label={`${rowIndex + 1}행 ${colIndex + 1}열 ${piece ? `${piece.color === "blue" ? "초" : "한"} ${names[piece.type]}` : "빈 교차점"}${move ? " 이동 가능" : ""}`}
                onClick={() => selectSquare(rowIndex, colIndex)}
              >
                {piece ? <span className={`janggi-piece ${piece.color}`}>{labels[piece.color][piece.type]}</span> : null}
              </button>
            );
          }))}
        </div>
      </div>
    </GameShell>
  );
}
