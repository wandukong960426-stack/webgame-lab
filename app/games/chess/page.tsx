"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import { trackGameEvent } from "@/lib/telemetry";

type Color = "w" | "b";
type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
type Piece = { type: PieceType; color: Color; moved: boolean };
type Square = Piece | null;
type Board = Square[][];
type Coord = { row: number; col: number };
type Move = {
  from: Coord;
  to: Coord;
  castle?: "king" | "queen";
  enPassant?: boolean;
  promotion?: PieceType;
};
type Mode = "ai" | "2p";
type Result = "white" | "black" | "draw" | null;
type Snapshot = {
  board: Board;
  turn: Color;
  enPassant: Coord | null;
  result: Result;
  notice: string;
};

const glyphs: Record<Color, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const pieceNames: Record<PieceType, string> = {
  k: "킹", q: "퀸", r: "룩", b: "비숍", n: "나이트", p: "폰",
};

const pieceValues: Record<PieceType, number> = { k: 1000, q: 9, r: 5, b: 3.2, n: 3, p: 1 };
const other = (color: Color): Color => color === "w" ? "b" : "w";
const inside = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;

function makePiece(type: PieceType, color: Color): Piece {
  return { type, color, moved: false };
}

function initialBoard(): Board {
  const order: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  return [
    order.map((type) => makePiece(type, "b")),
    Array.from({ length: 8 }, () => makePiece("p", "b")),
    ...Array.from({ length: 4 }, () => Array<Square>(8).fill(null)),
    Array.from({ length: 8 }, () => makePiece("p", "w")),
    order.map((type) => makePiece(type, "w")),
  ];
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((piece) => piece ? { ...piece } : null));
}

function findKing(board: Board, color: Color): Coord | null {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece?.type === "k" && piece.color === color) return { row, col };
    }
  }
  return null;
}

function isSquareAttacked(board: Board, row: number, col: number, byColor: Color) {
  const pawnDirection = byColor === "w" ? -1 : 1;
  const pawnRow = row - pawnDirection;
  for (const pawnCol of [col - 1, col + 1]) {
    if (inside(pawnRow, pawnCol)) {
      const piece = board[pawnRow][pawnCol];
      if (piece?.color === byColor && piece.type === "p") return true;
    }
  }

  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const r = row + dr;
    const c = col + dc;
    if (inside(r, c) && board[r][c]?.color === byColor && board[r][c]?.type === "n") return true;
  }

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const r = row + dr;
      const c = col + dc;
      if (inside(r, c) && board[r][c]?.color === byColor && board[r][c]?.type === "k") return true;
    }
  }

  const rayChecks: Array<{ directions: Array<[number, number]>; types: PieceType[] }> = [
    { directions: [[1, 0], [-1, 0], [0, 1], [0, -1]], types: ["r", "q"] },
    { directions: [[1, 1], [1, -1], [-1, 1], [-1, -1]], types: ["b", "q"] },
  ];
  for (const group of rayChecks) {
    for (const [dr, dc] of group.directions) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const piece = board[r][c];
        if (piece) {
          if (piece.color === byColor && group.types.includes(piece.type)) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }
  return false;
}

function isInCheck(board: Board, color: Color) {
  const king = findKing(board, color);
  return !king || isSquareAttacked(board, king.row, king.col, other(color));
}

function pseudoMoves(board: Board, row: number, col: number, enPassant: Coord | null): Move[] {
  const piece = board[row][col];
  if (!piece) return [];
  const moves: Move[] = [];
  const from = { row, col };

  const addTarget = (targetRow: number, targetCol: number) => {
    if (!inside(targetRow, targetCol)) return false;
    const target = board[targetRow][targetCol];
    if (!target) {
      moves.push({ from, to: { row: targetRow, col: targetCol } });
      return true;
    }
    if (target.color !== piece.color && target.type !== "k") {
      moves.push({ from, to: { row: targetRow, col: targetCol } });
    }
    return false;
  };

  if (piece.type === "p") {
    const direction = piece.color === "w" ? -1 : 1;
    const startRow = piece.color === "w" ? 6 : 1;
    const one = row + direction;
    if (inside(one, col) && !board[one][col]) {
      moves.push({ from, to: { row: one, col }, promotion: one === 0 || one === 7 ? "q" : undefined });
      const two = row + direction * 2;
      if (row === startRow && !piece.moved && !board[two][col]) {
        moves.push({ from, to: { row: two, col } });
      }
    }
    for (const dc of [-1, 1]) {
      const targetRow = row + direction;
      const targetCol = col + dc;
      if (!inside(targetRow, targetCol)) continue;
      const target = board[targetRow][targetCol];
      if (target && target.color !== piece.color && target.type !== "k") {
        moves.push({ from, to: { row: targetRow, col: targetCol }, promotion: targetRow === 0 || targetRow === 7 ? "q" : undefined });
      } else if (
        enPassant?.row === targetRow &&
        enPassant.col === targetCol &&
        board[row][targetCol]?.type === "p" &&
        board[row][targetCol]?.color !== piece.color
      ) {
        moves.push({ from, to: { row: targetRow, col: targetCol }, enPassant: true });
      }
    }
  }

  if (piece.type === "n") {
    for (const [dr, dc] of [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ]) addTarget(row + dr, col + dc);
  }

  if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
    const directions: Array<[number, number]> = [];
    if (piece.type === "b" || piece.type === "q") directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    if (piece.type === "r" || piece.type === "q") directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const keepGoing = addTarget(r, c);
        if (!keepGoing) break;
        r += dr;
        c += dc;
      }
    }
  }

  if (piece.type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr || dc) addTarget(row + dr, col + dc);
      }
    }

    if (!piece.moved && !isInCheck(board, piece.color)) {
      const opponent = other(piece.color);
      const kingRook = board[row][7];
      if (
        kingRook?.type === "r" && kingRook.color === piece.color && !kingRook.moved &&
        !board[row][5] && !board[row][6] &&
        !isSquareAttacked(board, row, 5, opponent) && !isSquareAttacked(board, row, 6, opponent)
      ) {
        moves.push({ from, to: { row, col: 6 }, castle: "king" });
      }
      const queenRook = board[row][0];
      if (
        queenRook?.type === "r" && queenRook.color === piece.color && !queenRook.moved &&
        !board[row][1] && !board[row][2] && !board[row][3] &&
        !isSquareAttacked(board, row, 3, opponent) && !isSquareAttacked(board, row, 2, opponent)
      ) {
        moves.push({ from, to: { row, col: 2 }, castle: "queen" });
      }
    }
  }

  return moves;
}

function applyMove(board: Board, move: Move): { board: Board; enPassant: Coord | null; captured: Piece | null } {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  if (!piece) return { board: next, enPassant: null, captured: null };
  let captured = next[move.to.row][move.to.col];

  if (move.enPassant) {
    captured = next[move.from.row][move.to.col];
    next[move.from.row][move.to.col] = null;
  }

  next[move.from.row][move.from.col] = null;
  next[move.to.row][move.to.col] = {
    ...piece,
    moved: true,
    type: move.promotion ?? piece.type,
  };

  if (move.castle === "king") {
    const rook = next[move.from.row][7];
    next[move.from.row][7] = null;
    if (rook) next[move.from.row][5] = { ...rook, moved: true };
  }
  if (move.castle === "queen") {
    const rook = next[move.from.row][0];
    next[move.from.row][0] = null;
    if (rook) next[move.from.row][3] = { ...rook, moved: true };
  }

  const nextEnPassant = piece.type === "p" && Math.abs(move.to.row - move.from.row) === 2
    ? { row: (move.from.row + move.to.row) / 2, col: move.from.col }
    : null;
  return { board: next, enPassant: nextEnPassant, captured };
}

function legalMovesForPiece(board: Board, row: number, col: number, enPassant: Coord | null) {
  const piece = board[row][col];
  if (!piece) return [];
  return pseudoMoves(board, row, col, enPassant).filter((move) => {
    const next = applyMove(board, move).board;
    return !isInCheck(next, piece.color);
  });
}

function allLegalMoves(board: Board, color: Color, enPassant: Coord | null) {
  const moves: Move[] = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (board[row][col]?.color === color) moves.push(...legalMovesForPiece(board, row, col, enPassant));
    }
  }
  return moves;
}

function evaluatePosition(board: Board, turn: Color, enPassant: Coord | null) {
  const legal = allLegalMoves(board, turn, enPassant);
  const check = isInCheck(board, turn);
  if (!legal.length) {
    if (check) {
      const result: Result = turn === "w" ? "black" : "white";
      return { result, notice: `${result === "white" ? "백" : "흑"} 체크메이트 승리!`, check };
    }
    return { result: "draw" as Result, notice: "둘 수 있는 합법 수가 없어 스테일메이트 무승부입니다.", check };
  }
  return {
    result: null as Result,
    notice: check ? `${turn === "w" ? "백" : "흑"} 킹이 체크 상태입니다.` : `${turn === "w" ? "백" : "흑"} 차례입니다.`,
    check,
  };
}

function chooseAiMove(board: Board, enPassant: Coord | null) {
  const moves = allLegalMoves(board, "b", enPassant);
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const target = board[move.to.row][move.to.col];
    const applied = applyMove(board, move);
    const givesCheck = isInCheck(applied.board, "w");
    const center = 4 - (Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5)) * 0.35;
    const danger = allLegalMoves(applied.board, "w", applied.enPassant)
      .filter((reply) => reply.to.row === move.to.row && reply.to.col === move.to.col)
      .reduce((max, reply) => Math.max(max, pieceValues[applied.board[reply.from.row][reply.from.col]?.type ?? "p"]), 0);
    const moving = board[move.from.row][move.from.col];
    const score =
      (target ? pieceValues[target.type] * 12 : 0) +
      (move.enPassant ? 12 : 0) +
      (move.promotion ? 70 : 0) +
      (move.castle ? 6 : 0) +
      (givesCheck ? 8 : 0) +
      center -
      (moving ? Math.max(0, danger - pieceValues[moving.type]) * 8 : 0) +
      Math.random() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

export default function ChessPage() {
  const { play } = useGameAudio();
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<Color>("w");
  const [enPassant, setEnPassant] = useState<Coord | null>(null);
  const [mode, setMode] = useState<Mode>("ai");
  const [selected, setSelected] = useState<Coord | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [notice, setNotice] = useState("백 차례입니다.");
  const [history, setHistory] = useState<Snapshot[]>([]);

  const pieces = useMemo(() => board.flat().reduce((acc, piece) => {
    if (piece?.color === "w") acc.white += 1;
    if (piece?.color === "b") acc.black += 1;
    return acc;
  }, { white: 0, black: 0 }), [board]);

  const checkedKing = useMemo(() => isInCheck(board, turn) ? findKing(board, turn) : null, [board, turn]);
  const legalMap = useMemo(() => new Map(legal.map((move) => [`${move.to.row},${move.to.col}`, move])), [legal]);

  const reset = useCallback((nextMode = mode) => {
    setBoard(initialBoard());
    setTurn("w");
    setEnPassant(null);
    setSelected(null);
    setLegal([]);
    setResult(null);
    setNotice("백 차례입니다.");
    setHistory([]);
    trackGameEvent("game_restart", "chess", { mode: nextMode });
  }, [mode]);

  const performMove = useCallback((move: Move) => {
    if (result) return;
    const moving = board[move.from.row][move.from.col];
    if (!moving || moving.color !== turn) return;

    setHistory((items) => [...items, {
      board: cloneBoard(board), turn, enPassant, result, notice,
    }]);
    const applied = applyMove(board, move);
    const nextTurn = other(turn);
    const outcome = evaluatePosition(applied.board, nextTurn, applied.enPassant);

    setBoard(applied.board);
    setEnPassant(applied.enPassant);
    setTurn(nextTurn);
    setSelected(null);
    setLegal([]);
    setResult(outcome.result);
    setNotice(outcome.notice);
    play(applied.captured ? "capture" : outcome.result ? "win" : "move");

    if (outcome.result) {
      if (mode === "ai" && outcome.result === "black") play("lose");
      trackGameEvent("game_end", "chess", {
        result: outcome.result,
        mode,
        plies: history.length + 1,
      });
    }
  }, [board, enPassant, history.length, mode, notice, play, result, turn]);

  useEffect(() => {
    if (mode !== "ai" || turn !== "b" || result) return;
    const timer = window.setTimeout(() => {
      const move = chooseAiMove(board, enPassant);
      if (move) performMove(move);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [board, enPassant, mode, performMove, result, turn]);

  const selectSquare = (row: number, col: number) => {
    if (result || (mode === "ai" && turn === "b")) return;
    const move = legalMap.get(`${row},${col}`);
    if (selected && move) {
      performMove(move);
      return;
    }

    const piece = board[row][col];
    if (piece?.color === turn) {
      setSelected({ row, col });
      setLegal(legalMovesForPiece(board, row, col, enPassant));
      play("select");
    } else {
      setSelected(null);
      setLegal([]);
    }
  };

  const undo = () => {
    if (!history.length) return;
    const steps = mode === "ai" && turn === "w" && history.length >= 2 ? 2 : 1;
    const index = Math.max(0, history.length - steps);
    const snapshot = history[index];
    setBoard(cloneBoard(snapshot.board));
    setTurn(snapshot.turn);
    setEnPassant(snapshot.enPassant);
    setResult(snapshot.result);
    setNotice(snapshot.notice);
    setSelected(null);
    setLegal([]);
    setHistory((items) => items.slice(0, index));
    play("select");
  };

  return (
    <GameShell
      slug="chess"
      title="체스"
      kicker="정통 8×8 체스"
      description="기물을 선택하면 이동 가능한 칸이 표시됩니다. 체크를 피하고 상대 킹을 체크메이트하세요."
      theme="royal"
      status={<span className="status-inline"><i className="status-dot" />{mode === "ai" && turn === "b" && !result ? "컴퓨터가 다음 수를 계산하는 중…" : notice}</span>}
      score={
        <>
          <div className="score-chip"><span>백 기물</span><strong>{pieces.white}</strong></div>
          <div className="score-chip"><span>흑 기물</span><strong>{pieces.black}</strong></div>
          <div className="score-chip"><span>진행 수</span><strong>{history.length}</strong></div>
        </>
      }
      actions={
        <>
          <div className="segmented full-row" aria-label="대전 방식">
            <button type="button" className={mode === "ai" ? "is-active" : ""} onClick={() => { setMode("ai"); reset("ai"); trackGameEvent("game_mode_change", "chess", { mode: "ai" }); }}>AI 대전</button>
            <button type="button" className={mode === "2p" ? "is-active" : ""} onClick={() => { setMode("2p"); reset("2p"); trackGameEvent("game_mode_change", "chess", { mode: "2p" }); }}>같은 기기 2인</button>
          </div>
          <button type="button" className="control-button control-button--primary" onClick={() => reset()}>새 대국</button>
          <button type="button" className="control-button" onClick={undo} disabled={!history.length}>한 수 무르기</button>
        </>
      }
      rules={
        <ul>
          <li>체크 상태에서는 반드시 킹을 안전하게 만드는 수를 둬야 합니다.</li>
          <li>캐슬링·앙파상·폰 두 칸 전진을 지원합니다.</li>
          <li>마지막 줄에 도착한 폰은 자동으로 퀸으로 승격합니다.</li>
        </ul>
      }
      tip={<p>초반에는 중앙 폰과 나이트·비숍을 전개하고, 킹은 일찍 캐슬링해 안전하게 두세요.</p>}
    >
      <div className="chess-board" role="grid" aria-label="8×8 체스판">
        {board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
          const key = `${rowIndex},${colIndex}`;
          const move = legalMap.get(key);
          const isSelected = selected?.row === rowIndex && selected.col === colIndex;
          const isChecked = checkedKing?.row === rowIndex && checkedKing.col === colIndex;
          const classes = [
            "chess-cell",
            (rowIndex + colIndex) % 2 ? "dark" : "",
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
              aria-label={`${8 - rowIndex}${String.fromCharCode(97 + colIndex)} ${piece ? `${piece.color === "w" ? "백" : "흑"} ${pieceNames[piece.type]}` : "빈칸"}${move ? " 이동 가능" : ""}`}
              onClick={() => selectSquare(rowIndex, colIndex)}
            >
              {piece ? <span className={`chess-piece ${piece.color === "w" ? "white" : "black"}`}>{glyphs[piece.color][piece.type]}</span> : null}
            </button>
          );
        }))}
      </div>
    </GameShell>
  );
}
