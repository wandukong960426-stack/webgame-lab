"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import { trackGameEvent } from "@/lib/telemetry";

type Direction = "left" | "right" | "up" | "down";
type Board = number[][];
type MoveResult = { board: Board; gained: number; moved: boolean; merged: boolean };
type Snapshot = { board: Board; score: number; won: boolean; gameOver: boolean };

const SIZE = 4;
const baseBoard = (): Board => Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
const starterBoard = (): Board => {
  const board = baseBoard();
  board[1][1] = 2;
  board[2][2] = 2;
  return board;
};
const cloneBoard = (board: Board) => board.map((row) => row.slice());

function addRandomTile(board: Board) {
  const next = cloneBoard(board);
  const empty: Array<[number, number]> = [];
  next.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
    if (!value) empty.push([rowIndex, colIndex]);
  }));
  if (!empty.length) return next;
  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  next[row][col] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideLine(line: number[]) {
  const values = line.filter(Boolean);
  const output: number[] = [];
  let gained = 0;
  let merged = false;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === values[index + 1]) {
      const value = values[index] * 2;
      output.push(value);
      gained += value;
      merged = true;
      index += 1;
    } else {
      output.push(values[index]);
    }
  }
  while (output.length < SIZE) output.push(0);
  return { line: output, gained, merged };
}

function transpose(board: Board): Board {
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => board[col][row]),
  );
}

function moveBoard(board: Board, direction: Direction): MoveResult {
  let working = cloneBoard(board);
  const vertical = direction === "up" || direction === "down";
  const reverse = direction === "right" || direction === "down";
  if (vertical) working = transpose(working);

  let gained = 0;
  let merged = false;
  working = working.map((row) => {
    const source = reverse ? row.slice().reverse() : row.slice();
    const result = slideLine(source);
    gained += result.gained;
    merged ||= result.merged;
    return reverse ? result.line.reverse() : result.line;
  });

  if (vertical) working = transpose(working);
  const moved = working.some((row, r) => row.some((value, c) => value !== board[r][c]));
  return { board: working, gained, moved, merged };
}

function hasMoves(board: Board) {
  if (board.some((row) => row.some((value) => value === 0))) return true;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (row + 1 < SIZE && board[row][col] === board[row + 1][col]) return true;
      if (col + 1 < SIZE && board[row][col] === board[row][col + 1]) return true;
    }
  }
  return false;
}

export default function Game2048Page() {
  const { play } = useGameAudio();
  const [board, setBoard] = useState<Board>(starterBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("ddanjitmoa:2048:best") || 0);
    if (Number.isFinite(stored)) setBest(stored);
  }, []);

  const updateBest = useCallback((nextScore: number) => {
    setBest((current) => {
      const next = Math.max(current, nextScore);
      window.localStorage.setItem("ddanjitmoa:2048:best", String(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setBoard(addRandomTile(addRandomTile(baseBoard())));
    setScore(0);
    setWon(false);
    setGameOver(false);
    setHistory([]);
    trackGameEvent("game_restart", "2048");
  }, []);

  const move = useCallback((direction: Direction) => {
    if (gameOver) {
      play("error");
      return;
    }
    const result = moveBoard(board, direction);
    if (!result.moved) {
      play("error");
      return;
    }

    setHistory((items) => [...items.slice(-9), { board: cloneBoard(board), score, won, gameOver }]);
    const next = addRandomTile(result.board);
    const nextScore = score + result.gained;
    const reached2048 = next.some((row) => row.some((value) => value >= 2048));
    const ended = !hasMoves(next);

    setBoard(next);
    setScore(nextScore);
    updateBest(nextScore);
    play(result.merged ? "merge" : "move");

    if (!won && reached2048) {
      setWon(true);
      play("win");
      trackGameEvent("game_end", "2048", { result: "2048", score: nextScore });
    }
    if (ended) {
      setGameOver(true);
      play("lose");
      trackGameEvent("game_end", "2048", { result: "no_moves", score: nextScore });
    }
  }, [board, gameOver, play, score, updateBest, won]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Record<string, Direction | undefined> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
      };
      const direction = map[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  const undo = () => {
    const snapshot = history.at(-1);
    if (!snapshot) return;
    setBoard(cloneBoard(snapshot.board));
    setScore(snapshot.score);
    setWon(snapshot.won);
    setGameOver(snapshot.gameOver);
    setHistory((items) => items.slice(0, -1));
    play("select");
  };

  const maxTile = Math.max(...board.flat());
  const status = gameOver
    ? "더 이상 움직일 수 없습니다. 최고 기록을 갱신했나요?"
    : won
      ? "2048 달성! 계속 합쳐 더 높은 숫자에 도전할 수 있습니다."
      : "방향키 또는 화면 스와이프로 같은 숫자를 합치세요.";

  return (
    <GameShell
      slug="2048"
      title="2048"
      kicker="숫자 합치기 퍼즐"
      description="같은 숫자를 한 방향으로 밀어 합치고, 판이 가득 차기 전에 2048 타일을 만드세요."
      theme="neon"
      status={<span className="status-inline"><i className="status-dot" />{status}</span>}
      score={
        <>
          <div className="score-chip"><span>점수</span><strong>{score}</strong></div>
          <div className="score-chip"><span>최고 기록</span><strong>{best}</strong></div>
          <div className="score-chip"><span>최대 타일</span><strong>{maxTile || 2}</strong></div>
        </>
      }
      actions={
        <>
          <button type="button" className="control-button control-button--primary full-row" onClick={reset}>새 게임</button>
          <button type="button" className="control-button full-row" onClick={undo} disabled={!history.length}>한 수 되돌리기</button>
          <div className="segmented segmented--three full-row" aria-label="2048 방향 조작">
            <button type="button" onClick={() => move("left")}>←</button>
            <button type="button" onClick={() => move("up")}>↑</button>
            <button type="button" onClick={() => move("right")}>→</button>
          </div>
          <button type="button" className="control-button full-row" onClick={() => move("down")}>아래로 ↓</button>
        </>
      }
      rules={
        <ul>
          <li>모든 타일은 선택한 방향 끝까지 이동합니다.</li>
          <li>같은 숫자 두 개가 만나면 한 번만 합쳐집니다.</li>
          <li>빈칸이 없고 합칠 수도 없으면 게임이 끝납니다.</li>
        </ul>
      }
      tip={<p>큰 숫자는 한쪽 모서리에 고정하고, 그 모서리를 기준으로 한 방향의 행·열을 유지하세요.</p>}
    >
      <div
        className="game-2048"
        onPointerDown={(event) => { touchStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
          else move(dy > 0 ? "down" : "up");
        }}
      >
        <div className="tile-grid" role="grid" aria-label="2048 4×4 게임판">
          {board.flatMap((row, rowIndex) => row.map((value, colIndex) => (
            <div
              className="tile"
              data-value={value || undefined}
              role="gridcell"
              aria-label={`${rowIndex + 1}행 ${colIndex + 1}열 ${value || "빈칸"}`}
              key={`${rowIndex}-${colIndex}`}
            >
              {value || ""}
            </div>
          )))}
        </div>
        <p className="swipe-hint">모바일: 상하좌우로 스와이프 · PC: 방향키 또는 WASD</p>
      </div>
    </GameShell>
  );
}
