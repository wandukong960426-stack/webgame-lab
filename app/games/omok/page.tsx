"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import {
  clearGameProgress,
  loadGameProgress,
  saveGameProgress,
} from "@/lib/game-progress";
import { trackGameEvent } from "@/lib/telemetry";

type Stone = 0 | 1 | 2;
type PlayerStone = 1 | 2;
type Winner = Stone | "draw";
type Mode = "ai" | "2p";
type Point = { row: number; col: number };
type Snapshot = {
  board: Stone[][];
  turn: PlayerStone;
  winner: Winner;
  lastMove: Point | null;
  winningLine: Point[];
};
type SavedOmokState = Snapshot & {
  mode: Mode;
  history: Snapshot[];
};

const SIZE = 15;
const CANVAS = 680;
const PADDING = 38;
const GAP = (CANVAS - PADDING * 2) / (SIZE - 1);
const MAX_SAVED_HISTORY = 60;
const directions = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

const emptyBoard = (): Stone[][] =>
  Array.from({ length: SIZE }, () => Array<Stone>(SIZE).fill(0));

function cloneBoard(board: Stone[][]) {
  return board.map((row) => row.slice()) as Stone[][];
}

function clonePoint(point: Point | null) {
  return point ? { row: point.row, col: point.col } : null;
}

function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return {
    board: cloneBoard(snapshot.board),
    turn: snapshot.turn,
    winner: snapshot.winner,
    lastMove: clonePoint(snapshot.lastMove),
    winningLine: snapshot.winningLine.map((point) => ({ ...point })),
  };
}

function isStone(value: unknown): value is Stone {
  return value === 0 || value === 1 || value === 2;
}

function isPlayerStone(value: unknown): value is PlayerStone {
  return value === 1 || value === 2;
}

function isWinner(value: unknown): value is Winner {
  return isStone(value) || value === "draw";
}

function isMode(value: unknown): value is Mode {
  return value === "ai" || value === "2p";
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<Point>;
  return (
    Number.isInteger(point.row) &&
    Number.isInteger(point.col) &&
    Number(point.row) >= 0 &&
    Number(point.row) < SIZE &&
    Number(point.col) >= 0 &&
    Number(point.col) < SIZE
  );
}

function isPointList(value: unknown): value is Point[] {
  return Array.isArray(value) && value.length <= SIZE * SIZE && value.every(isPoint);
}

function isBoard(value: unknown): value is Stone[][] {
  return (
    Array.isArray(value) &&
    value.length === SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every(isStone),
    )
  );
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<Snapshot>;
  return (
    isBoard(snapshot.board) &&
    isPlayerStone(snapshot.turn) &&
    isWinner(snapshot.winner) &&
    (snapshot.lastMove === null || isPoint(snapshot.lastMove)) &&
    isPointList(snapshot.winningLine)
  );
}

function isSavedOmokState(value: unknown): value is SavedOmokState {
  if (!value || typeof value !== "object" || !isSnapshot(value)) return false;
  const state = value as Partial<SavedOmokState>;
  return (
    isMode(state.mode) &&
    Array.isArray(state.history) &&
    state.history.length <= SIZE * SIZE &&
    state.history.every(isSnapshot)
  );
}

function getWinningLine(board: Stone[][], row: number, col: number, stone: Stone): Point[] {
  if (!stone) return [];
  for (const [dr, dc] of directions) {
    const line: Point[] = [{ row, col }];
    for (const sign of [-1, 1] as const) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      const side: Point[] = [];
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === stone) {
        side.push({ row: r, col: c });
        r += dr * sign;
        c += dc * sign;
      }
      if (sign === -1) line.unshift(...side.reverse());
      else line.push(...side);
    }
    if (line.length >= 5) return line;
  }
  return [];
}

function linePotential(board: Stone[][], row: number, col: number, stone: Stone) {
  let total = 0;
  for (const [dr, dc] of directions) {
    let count = 1;
    let open = 0;
    for (const sign of [-1, 1] as const) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === stone) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === 0) open += 1;
    }
    const weights = [0, 2, 10, 70, 700, 20_000];
    total += weights[Math.min(count, 5)] * (open === 2 ? 1.5 : open === 1 ? 0.8 : 0.2);
  }
  return total;
}

function chooseAiMove(board: Stone[][]): Point | null {
  const hasStone = board.some((row) => row.some(Boolean));
  if (!hasStone) return { row: 7, col: 7 };

  const candidates: Point[] = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col]) continue;
      let nearby = false;
      for (let dr = -2; dr <= 2 && !nearby; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c]) {
            nearby = true;
            break;
          }
        }
      }
      if (nearby) candidates.push({ row, col });
    }
  }

  let best: Point | null = null;
  let bestScore = -Infinity;
  for (const point of candidates) {
    const attack = cloneBoard(board);
    attack[point.row][point.col] = 2;
    if (getWinningLine(attack, point.row, point.col, 2).length) return point;

    const defend = cloneBoard(board);
    defend[point.row][point.col] = 1;
    const blocksWin = getWinningLine(defend, point.row, point.col, 1).length > 0;

    const centerDistance = Math.abs(point.row - 7) + Math.abs(point.col - 7);
    const score =
      linePotential(attack, point.row, point.col, 2) * 1.14 +
      linePotential(defend, point.row, point.col, 1) +
      (blocksWin ? 100_000 : 0) -
      centerDistance * 0.7 +
      Math.random() * 2;

    if (score > bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best;
}

function OmokBoard({
  board,
  lastMove,
  winningLine,
  disabled,
  onMove,
}: {
  board: Stone[][];
  lastMove: Point | null;
  winningLine: Point[];
  disabled: boolean;
  onMove: (row: number, col: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, CANVAS, CANVAS);
    gradient.addColorStop(0, "#edc27f");
    gradient.addColorStop(1, "#c88d45");
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS, CANVAS);

    context.strokeStyle = "rgba(66, 41, 18, 0.72)";
    context.lineWidth = 1.45;
    for (let index = 0; index < SIZE; index += 1) {
      const point = PADDING + index * GAP;
      context.beginPath();
      context.moveTo(PADDING, point);
      context.lineTo(CANVAS - PADDING, point);
      context.stroke();
      context.beginPath();
      context.moveTo(point, PADDING);
      context.lineTo(point, CANVAS - PADDING);
      context.stroke();
    }

    context.fillStyle = "#4c3119";
    for (const [row, col] of [
      [3, 3], [3, 11], [7, 7], [11, 3], [11, 11],
    ]) {
      context.beginPath();
      context.arc(PADDING + col * GAP, PADDING + row * GAP, 4.6, 0, Math.PI * 2);
      context.fill();
    }

    board.forEach((line, row) => {
      line.forEach((stone, col) => {
        if (!stone) return;
        const x = PADDING + col * GAP;
        const y = PADDING + row * GAP;
        const stoneGradient = context.createRadialGradient(x - 9, y - 10, 2, x, y, 22);
        if (stone === 1) {
          stoneGradient.addColorStop(0, "#5f5f5f");
          stoneGradient.addColorStop(0.48, "#202020");
          stoneGradient.addColorStop(1, "#050505");
        } else {
          stoneGradient.addColorStop(0, "#ffffff");
          stoneGradient.addColorStop(0.65, "#ececec");
          stoneGradient.addColorStop(1, "#c7c7c7");
        }
        context.beginPath();
        context.arc(x, y, GAP * 0.38, 0, Math.PI * 2);
        context.fillStyle = stoneGradient;
        context.shadowColor = "rgba(0, 0, 0, 0.32)";
        context.shadowBlur = 7;
        context.shadowOffsetY = 4;
        context.fill();
        context.shadowColor = "transparent";
        context.strokeStyle = stone === 1 ? "#000" : "#aaa";
        context.stroke();
      });
    });

    if (lastMove) {
      context.beginPath();
      context.arc(
        PADDING + lastMove.col * GAP,
        PADDING + lastMove.row * GAP,
        5,
        0,
        Math.PI * 2,
      );
      context.fillStyle = board[lastMove.row][lastMove.col] === 1 ? "#f3b93f" : "#d94b4b";
      context.fill();
    }

    if (winningLine.length >= 5) {
      const first = winningLine[0];
      const last = winningLine[winningLine.length - 1];
      context.beginPath();
      context.moveTo(PADDING + first.col * GAP, PADDING + first.row * GAP);
      context.lineTo(PADDING + last.col * GAP, PADDING + last.row * GAP);
      context.strokeStyle = "#ef3f37";
      context.lineWidth = 7;
      context.lineCap = "round";
      context.stroke();
    }
  }, [board, lastMove, winningLine]);

  return (
    <div className="omok-wrap">
      <canvas
        ref={canvasRef}
        className="omok-canvas"
        width={CANVAS}
        height={CANVAS}
        aria-label="15×15 오목판"
        onPointerDown={(event) => {
          if (disabled) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) * CANVAS) / rect.width;
          const y = ((event.clientY - rect.top) * CANVAS) / rect.height;
          const col = Math.round((x - PADDING) / GAP);
          const row = Math.round((y - PADDING) / GAP);
          if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) onMove(row, col);
        }}
      />
    </div>
  );
}

export default function OmokPage() {
  const { play } = useGameAudio();
  const [board, setBoard] = useState<Stone[][]>(emptyBoard);
  const [turn, setTurn] = useState<PlayerStone>(1);
  const [mode, setMode] = useState<Mode>("ai");
  const [winner, setWinner] = useState<Winner>(0);
  const [lastMove, setLastMove] = useState<Point | null>(null);
  const [winningLine, setWinningLine] = useState<Point[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const stones = useMemo(
    () => board.reduce((total, row) => total + row.filter(Boolean).length, 0),
    [board],
  );

  useEffect(() => {
    const saved = loadGameProgress<unknown>("omok");
    if (saved && isSavedOmokState(saved.state) && saved.state.winner === 0) {
      const restoredStones = saved.state.board.reduce(
        (total, row) => total + row.filter(Boolean).length,
        0,
      );

      if (restoredStones > 0) {
        setBoard(cloneBoard(saved.state.board));
        setTurn(saved.state.turn);
        setMode(saved.state.mode);
        setWinner(0);
        setLastMove(clonePoint(saved.state.lastMove));
        setWinningLine(saved.state.winningLine.map((point) => ({ ...point })));
        setHistory(
          saved.state.history
            .slice(-MAX_SAVED_HISTORY)
            .map(cloneSnapshot),
        );
        trackGameEvent("game_resume", "omok", {
          mode: saved.state.mode,
          moves: restoredStones,
        });
      } else {
        clearGameProgress("omok");
      }
    } else if (saved) {
      clearGameProgress("omok");
    }
    setHydrated(true);
  }, []);

  const reset = useCallback((nextMode = mode) => {
    clearGameProgress("omok");
    setBoard(emptyBoard());
    setTurn(1);
    setWinner(0);
    setLastMove(null);
    setWinningLine([]);
    setHistory([]);
    trackGameEvent("game_restart", "omok", { mode: nextMode });
  }, [mode]);

  const commitMove = useCallback((row: number, col: number, stone: PlayerStone) => {
    setBoard((current) => {
      if (current[row][col] || winner) return current;
      const next = cloneBoard(current);
      next[row][col] = stone;
      const line = getWinningLine(next, row, col, stone);
      const isDraw = !line.length && next.every((nextRow) => nextRow.every(Boolean));

      setHistory((items) => [
        ...items,
        {
          board: cloneBoard(current),
          turn,
          winner,
          lastMove: clonePoint(lastMove),
          winningLine: winningLine.map((point) => ({ ...point })),
        },
      ]);
      setLastMove({ row, col });
      play(line.length ? "win" : "move");

      if (line.length) {
        setWinner(stone);
        setWinningLine(line);
        trackGameEvent("game_end", "omok", {
          result: stone === 1 ? "black" : mode === "ai" ? "computer" : "white",
          moves: stones + 1,
          mode,
        });
      } else if (isDraw) {
        setWinner("draw");
        trackGameEvent("game_end", "omok", { result: "draw", moves: stones + 1, mode });
      } else {
        setTurn(stone === 1 ? 2 : 1);
      }
      return next;
    });
  }, [lastMove, mode, play, stones, turn, winner, winningLine]);

  useEffect(() => {
    if (!hydrated || mode !== "ai" || turn !== 2 || winner) return;
    const timer = window.setTimeout(() => {
      const move = chooseAiMove(board);
      if (move) commitMove(move.row, move.col, 2);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [board, commitMove, hydrated, mode, turn, winner]);

  useEffect(() => {
    if (!hydrated) return;
    if (winner || stones === 0) {
      clearGameProgress("omok");
      return;
    }

    saveGameProgress<SavedOmokState>({
      slug: "omok",
      title: "오목",
      theme: "wood",
      symbol: "● ○",
      summary: `${mode === "ai" ? "AI 대전" : "2인 대전"} · ${stones}수 · ${turn === 1 ? "흑" : mode === "ai" ? "컴퓨터" : "백"} 차례`,
      state: {
        board: cloneBoard(board),
        turn,
        mode,
        winner,
        lastMove: clonePoint(lastMove),
        winningLine: winningLine.map((point) => ({ ...point })),
        history: history
          .slice(-MAX_SAVED_HISTORY)
          .map(cloneSnapshot),
      },
    });
  }, [board, history, hydrated, lastMove, mode, stones, turn, winner, winningLine]);

  const undo = () => {
    if (!history.length) return;
    const steps = mode === "ai" && turn === 1 && history.length >= 2 ? 2 : 1;
    const targetIndex = Math.max(0, history.length - steps);
    const snapshot = history[targetIndex];
    setBoard(cloneBoard(snapshot.board));
    setTurn(snapshot.turn);
    setWinner(snapshot.winner);
    setLastMove(clonePoint(snapshot.lastMove));
    setWinningLine(snapshot.winningLine.map((point) => ({ ...point })));
    setHistory((items) => items.slice(0, targetIndex));
    play("select");
  };

  const status = winner === "draw"
    ? "빈칸이 없어 무승부입니다. 다시 한 판 두어보세요."
    : winner === 1
      ? "흑이 다섯 줄을 완성했습니다!"
      : winner === 2
        ? mode === "ai" ? "컴퓨터가 다섯 줄을 완성했습니다." : "백이 다섯 줄을 완성했습니다!"
        : mode === "ai" && turn === 2
          ? "컴퓨터가 수를 읽는 중…"
          : `${turn === 1 ? "흑" : "백"} 차례입니다.${hydrated && stones > 0 ? " 진행 상황은 자동 저장됩니다." : ""}`;

  return (
    <GameShell
      slug="omok"
      title="오목"
      kicker="15×15 전략 대결"
      description="빈 교차점을 눌러 돌을 놓고 가로·세로·대각선 다섯 줄을 먼저 완성하세요."
      theme="wood"
      status={<span className="status-inline"><i className="status-dot" />{status}</span>}
      score={
        <>
          <div className="score-chip"><span>놓인 돌</span><strong>{stones}</strong></div>
          <div className="score-chip"><span>현재 모드</span><strong>{mode === "ai" ? "AI" : "2P"}</strong></div>
        </>
      }
      actions={
        <>
          <div className="segmented full-row" aria-label="대전 방식">
            <button
              type="button"
              className={mode === "ai" ? "is-active" : ""}
              onClick={() => { setMode("ai"); reset("ai"); trackGameEvent("game_mode_change", "omok", { mode: "ai" }); }}
            >AI 대전</button>
            <button
              type="button"
              className={mode === "2p" ? "is-active" : ""}
              onClick={() => { setMode("2p"); reset("2p"); trackGameEvent("game_mode_change", "omok", { mode: "2p" }); }}
            >같은 기기 2인</button>
          </div>
          <button type="button" className="control-button control-button--primary" onClick={() => reset()}>
            다시 시작
          </button>
          <button type="button" className="control-button" onClick={undo} disabled={!history.length}>
            무르기
          </button>
        </>
      }
      rules={
        <ul>
          <li>흑이 먼저 두며 한 번에 돌 하나를 놓습니다.</li>
          <li>같은 돌 다섯 개 이상이 이어지면 승리합니다.</li>
          <li>삼삼·사사·장목 금수는 적용하지 않는 자유 오목입니다.</li>
        </ul>
      }
      tip={<p>중앙에서 시작하고, 내 열린 3을 키우는 동시에 상대의 열린 3을 먼저 막으세요.</p>}
    >
      <OmokBoard
        board={board}
        lastMove={lastMove}
        winningLine={winningLine}
        disabled={Boolean(winner) || (mode === "ai" && turn === 2)}
        onMove={(row, col) => {
          if (mode === "ai" && turn !== 1) return;
          commitMove(row, col, turn);
        }}
      />
    </GameShell>
  );
}
