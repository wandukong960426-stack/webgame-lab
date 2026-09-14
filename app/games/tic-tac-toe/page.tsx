"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import { trackGameEvent } from "@/lib/telemetry";

type Mark = 0 | 1 | 2;
type Mode = "ai" | "2p";
type BoardSize = 3 | 5;
type Result = { winner: Mark | "draw"; line: number[] };

type Scores = { x: number; o: number; draw: number };

function emptyBoard(size: BoardSize): Mark[] {
  return Array<Mark>(size * size).fill(0);
}

function findResult(board: Mark[], size: BoardSize): Result | null {
  const winLength = size === 3 ? 3 : 4;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const mark = board[row * size + col];
      if (!mark) continue;
      for (const [dr, dc] of directions) {
        const line: number[] = [];
        for (let step = 0; step < winLength; step += 1) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (r < 0 || r >= size || c < 0 || c >= size || board[r * size + c] !== mark) break;
          line.push(r * size + c);
        }
        if (line.length === winLength) return { winner: mark, line };
      }
    }
  }

  if (board.every(Boolean)) return { winner: "draw", line: [] };
  return null;
}

function available(board: Mark[]) {
  return board.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
}

function chooseAiMove(board: Mark[], size: BoardSize): number | null {
  const open = available(board);
  if (!open.length) return null;

  for (const mark of [2, 1] as const) {
    for (const index of open) {
      const next = board.slice() as Mark[];
      next[index] = mark;
      if (findResult(next, size)?.winner === mark) return index;
    }
  }

  const center = (size * size - 1) / 2;
  let best = open[0];
  let bestScore = -Infinity;
  for (const index of open) {
    const row = Math.floor(index / size);
    const col = index % size;
    const centerRow = Math.floor(size / 2);
    const centerCol = Math.floor(size / 2);
    let neighbors = 0;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c]) neighbors += 1;
      }
    }
    const isCorner = (row === 0 || row === size - 1) && (col === 0 || col === size - 1);
    const score =
      neighbors * 4 -
      (Math.abs(row - centerRow) + Math.abs(col - centerCol)) * 1.8 +
      (index === center ? 8 : 0) +
      (isCorner ? 2 : 0) +
      Math.random();
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

export default function TicTacToePage() {
  const { play } = useGameAudio();
  const [size, setSize] = useState<BoardSize>(5);
  const [board, setBoard] = useState<Mark[]>(() => emptyBoard(5));
  const [turn, setTurn] = useState<Mark>(1);
  const [mode, setMode] = useState<Mode>("ai");
  const [result, setResult] = useState<Result | null>(null);
  const [scores, setScores] = useState<Scores>({ x: 0, o: 0, draw: 0 });
  const [round, setRound] = useState(1);

  const nextRound = useCallback((nextSize = size) => {
    setBoard(emptyBoard(nextSize));
    setTurn(1);
    setResult(null);
    setRound((value) => value + 1);
    trackGameEvent("game_restart", "tic-tac-toe", { size: nextSize, mode });
  }, [mode, size]);

  const newMatch = useCallback((nextSize = size, nextMode = mode) => {
    setBoard(emptyBoard(nextSize));
    setTurn(1);
    setResult(null);
    setScores({ x: 0, o: 0, draw: 0 });
    setRound(1);
    trackGameEvent("game_restart", "tic-tac-toe", { size: nextSize, mode: nextMode, new_match: true });
  }, [mode, size]);

  const commit = useCallback((index: number, mark: Mark) => {
    if (!mark || board[index] || result) return;
    const next = board.slice() as Mark[];
    next[index] = mark;
    const nextResult = findResult(next, size);
    setBoard(next);
    play(nextResult ? "win" : "move");

    if (nextResult) {
      setResult(nextResult);
      setScores((current) => ({
        x: current.x + (nextResult.winner === 1 ? 1 : 0),
        o: current.o + (nextResult.winner === 2 ? 1 : 0),
        draw: current.draw + (nextResult.winner === "draw" ? 1 : 0),
      }));
      trackGameEvent("game_end", "tic-tac-toe", {
        result: nextResult.winner === "draw" ? "draw" : nextResult.winner === 1 ? "x" : "o",
        size,
        mode,
        round,
      });
      return;
    }
    setTurn(mark === 1 ? 2 : 1);
  }, [board, mode, play, result, round, size]);

  useEffect(() => {
    if (mode !== "ai" || turn !== 2 || result) return;
    const timer = window.setTimeout(() => {
      const index = chooseAiMove(board, size);
      if (index !== null) commit(index, 2);
    }, 340);
    return () => window.clearTimeout(timer);
  }, [board, commit, mode, result, size, turn]);

  const winnerSet = useMemo(() => new Set(result?.line ?? []), [result]);
  const status = result?.winner === "draw"
    ? "이번 판은 무승부입니다. 다음 라운드로 이어가세요."
    : result?.winner === 1
      ? "X가 승리했습니다!"
      : result?.winner === 2
        ? mode === "ai" ? "컴퓨터 O가 승리했습니다." : "O가 승리했습니다!"
        : mode === "ai" && turn === 2
          ? "컴퓨터가 빈틈을 찾는 중…"
          : `${turn === 1 ? "X" : "O"} 차례입니다. ${size === 5 ? "네 칸" : "세 칸"}을 이으세요.`;

  return (
    <GameShell
      slug="tic-tac-toe"
      title="틱택토+"
      kicker="5×5 확장판"
      description="클래식 3×3 또는 체류시간이 더 긴 5×5·4목 규칙으로 플레이하세요."
      theme="berry"
      status={<span className="status-inline"><i className="status-dot" />{status}</span>}
      score={
        <>
          <div className="score-chip"><span>X 승</span><strong>{scores.x}</strong></div>
          <div className="score-chip"><span>O 승</span><strong>{scores.o}</strong></div>
          <div className="score-chip"><span>무승부</span><strong>{scores.draw}</strong></div>
        </>
      }
      actions={
        <>
          <div className="segmented full-row" aria-label="보드 크기">
            <button type="button" className={size === 3 ? "is-active" : ""} onClick={() => { setSize(3); newMatch(3, mode); }}>3×3</button>
            <button type="button" className={size === 5 ? "is-active" : ""} onClick={() => { setSize(5); newMatch(5, mode); }}>5×5</button>
          </div>
          <div className="segmented full-row" aria-label="대전 방식">
            <button type="button" className={mode === "ai" ? "is-active" : ""} onClick={() => { setMode("ai"); newMatch(size, "ai"); trackGameEvent("game_mode_change", "tic-tac-toe", { mode: "ai" }); }}>AI 대전</button>
            <button type="button" className={mode === "2p" ? "is-active" : ""} onClick={() => { setMode("2p"); newMatch(size, "2p"); trackGameEvent("game_mode_change", "tic-tac-toe", { mode: "2p" }); }}>같은 기기 2인</button>
          </div>
          <button type="button" className="control-button control-button--primary" onClick={() => nextRound()}>다음 라운드</button>
          <button type="button" className="control-button" onClick={() => newMatch()}>점수 초기화</button>
        </>
      }
      rules={
        <ul>
          <li>3×3은 같은 기호 3개, 5×5는 같은 기호 4개를 먼저 잇습니다.</li>
          <li>가로·세로·대각선 모두 승리 줄로 인정합니다.</li>
          <li>라운드 점수는 크기나 모드를 바꿀 때 초기화됩니다.</li>
        </ul>
      }
      tip={<p>내 승리 수를 만드는 것보다 상대의 즉시 승리 수를 먼저 차단하세요. 5×5에서는 중앙 인접 칸의 가치가 큽니다.</p>}
    >
      <div className={`ttt-board size-${size}`} role="grid" aria-label={`${size}×${size} 틱택토 게임판`}>
        {board.map((mark, index) => (
          <button
            type="button"
            role="gridcell"
            className={`ttt-cell${mark === 1 ? " x" : mark === 2 ? " o" : ""}${winnerSet.has(index) ? " winner" : ""}`}
            key={index}
            disabled={Boolean(mark || result || (mode === "ai" && turn === 2))}
            aria-label={`${Math.floor(index / size) + 1}행 ${(index % size) + 1}열 ${mark === 1 ? "X" : mark === 2 ? "O" : "빈칸"}`}
            onClick={() => commit(index, turn)}
          >
            {mark === 1 ? "×" : mark === 2 ? "○" : ""}
          </button>
        ))}
      </div>
    </GameShell>
  );
}
