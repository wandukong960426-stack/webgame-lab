"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import {
  clearGameProgress,
  loadGameProgress,
  saveGameProgress,
} from "@/lib/game-progress";
import { trackGameEvent } from "@/lib/telemetry";

type Disc = 0 | 1 | 2;
type PlayerDisc = 1 | 2;
type Mode = "ai" | "2p";
type Winner = Disc | "draw";
type Move = { row: number; col: number; flips: Array<[number, number]> };
type Snapshot = {
  board: Disc[][];
  turn: PlayerDisc;
  winner: Winner;
  notice: string;
};
type SavedOthelloState = Snapshot & {
  mode: Mode;
  history: Snapshot[];
};

const SIZE = 8;
const MAX_HISTORY = 60;
const vectors = [-1, 0, 1]
  .flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc] as const))
  .filter(([dr, dc]) => dr !== 0 || dc !== 0);

function initialBoard(): Disc[][] {
  const board = Array.from({ length: SIZE }, () => Array<Disc>(SIZE).fill(0));
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
  return board;
}

function cloneBoard(board: Disc[][]) {
  return board.map((row) => row.slice()) as Disc[][];
}

function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return {
    board: cloneBoard(snapshot.board),
    turn: snapshot.turn,
    winner: snapshot.winner,
    notice: snapshot.notice,
  };
}

function isDisc(value: unknown): value is Disc {
  return value === 0 || value === 1 || value === 2;
}

function isPlayerDisc(value: unknown): value is PlayerDisc {
  return value === 1 || value === 2;
}

function isWinner(value: unknown): value is Winner {
  return isDisc(value) || value === "draw";
}

function isMode(value: unknown): value is Mode {
  return value === "ai" || value === "2p";
}

function isBoard(value: unknown): value is Disc[][] {
  return (
    Array.isArray(value) &&
    value.length === SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every(isDisc),
    )
  );
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<Snapshot>;
  return (
    isBoard(snapshot.board) &&
    isPlayerDisc(snapshot.turn) &&
    isWinner(snapshot.winner) &&
    typeof snapshot.notice === "string" &&
    snapshot.notice.length <= 160
  );
}

function isSavedOthelloState(value: unknown): value is SavedOthelloState {
  if (!value || typeof value !== "object" || !isSnapshot(value)) return false;
  const state = value as Partial<SavedOthelloState>;
  return (
    isMode(state.mode) &&
    Array.isArray(state.history) &&
    state.history.length <= MAX_HISTORY &&
    state.history.every(isSnapshot)
  );
}

function getFlips(board: Disc[][], row: number, col: number, player: PlayerDisc) {
  if (board[row][col]) return [] as Array<[number, number]>;
  const opponent: PlayerDisc = player === 1 ? 2 : 1;
  const all: Array<[number, number]> = [];

  for (const [dr, dc] of vectors) {
    const line: Array<[number, number]> = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === opponent) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
      all.push(...line);
    }
  }
  return all;
}

function validMoves(board: Disc[][], player: PlayerDisc): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const flips = getFlips(board, row, col, player);
      if (flips.length) moves.push({ row, col, flips });
    }
  }
  return moves;
}

function applyMove(board: Disc[][], move: Move, player: PlayerDisc) {
  const next = cloneBoard(board);
  next[move.row][move.col] = player;
  move.flips.forEach(([row, col]) => {
    next[row][col] = player;
  });
  return next;
}

function countDiscs(board: Disc[][]) {
  return board.flat().reduce(
    (acc, disc) => {
      if (disc === 1) acc.black += 1;
      if (disc === 2) acc.white += 1;
      return acc;
    },
    { black: 0, white: 0 },
  );
}

function chooseAiMove(board: Disc[][]): Move | null {
  const moves = validMoves(board, 2);
  if (!moves.length) return null;
  const corners = new Set(["0,0", "0,7", "7,0", "7,7"]);
  const danger = new Set(["0,1", "1,0", "1,1", "0,6", "1,6", "1,7", "6,0", "6,1", "7,1", "6,6", "6,7", "7,6"]);

  return moves.reduce((best, move) => {
    const key = `${move.row},${move.col}`;
    const edge = move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7;
    const next = applyMove(board, move, 2);
    const mobility = validMoves(next, 1).length;
    const score =
      move.flips.length * 3 +
      (corners.has(key) ? 180 : 0) +
      (edge ? 14 : 0) -
      (danger.has(key) ? 45 : 0) -
      mobility * 2 +
      Math.random();
    return score > best.score ? { move, score } : best;
  }, { move: moves[0], score: -Infinity }).move;
}

export default function OthelloPage() {
  const { play } = useGameAudio();
  const [board, setBoard] = useState<Disc[][]>(initialBoard);
  const [turn, setTurn] = useState<PlayerDisc>(1);
  const [mode, setMode] = useState<Mode>("ai");
  const [winner, setWinner] = useState<Winner>(0);
  const [notice, setNotice] = useState("흑 차례입니다.");
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const moves = useMemo(() => validMoves(board, turn), [board, turn]);
  const validKeys = useMemo(() => new Set(moves.map((move) => `${move.row},${move.col}`)), [moves]);
  const counts = useMemo(() => countDiscs(board), [board]);
  const movesPlayed = Math.max(0, counts.black + counts.white - 4);

  useEffect(() => {
    const saved = loadGameProgress<unknown>("othello");
    if (saved && isSavedOthelloState(saved.state) && saved.state.winner === 0) {
      const restoredCounts = countDiscs(saved.state.board);
      const restoredMoves = Math.max(0, restoredCounts.black + restoredCounts.white - 4);
      const currentMoves = validMoves(saved.state.board, saved.state.turn);
      const otherTurn: PlayerDisc = saved.state.turn === 1 ? 2 : 1;
      const otherMoves = validMoves(saved.state.board, otherTurn);

      if (restoredMoves > 0 && (currentMoves.length > 0 || otherMoves.length > 0)) {
        const restoredTurn = currentMoves.length > 0 ? saved.state.turn : otherTurn;
        setBoard(cloneBoard(saved.state.board));
        setTurn(restoredTurn);
        setMode(saved.state.mode);
        setWinner(0);
        setNotice(
          restoredTurn === saved.state.turn
            ? saved.state.notice
            : `${saved.state.turn === 1 ? "흑" : "백"}이 둘 곳이 없어 한 차례 쉽니다.`,
        );
        setHistory(saved.state.history.slice(-MAX_HISTORY).map(cloneSnapshot));
        trackGameEvent("game_resume", "othello", {
          mode: saved.state.mode,
          moves: restoredMoves,
          black: restoredCounts.black,
          white: restoredCounts.white,
        });
      } else {
        clearGameProgress("othello");
      }
    } else if (saved) {
      clearGameProgress("othello");
    }
    setHydrated(true);
  }, []);

  const reset = useCallback((nextMode = mode) => {
    clearGameProgress("othello");
    setBoard(initialBoard());
    setTurn(1);
    setWinner(0);
    setNotice("흑 차례입니다.");
    setHistory([]);
    trackGameEvent("game_restart", "othello", { mode: nextMode });
  }, [mode]);

  const finishGame = useCallback((nextBoard: Disc[][]) => {
    const { black, white } = countDiscs(nextBoard);
    const result: Winner = black === white ? "draw" : black > white ? 1 : 2;
    clearGameProgress("othello");
    setWinner(result);
    setNotice(result === "draw" ? `무승부입니다. ${black}:${white}` : `${result === 1 ? "흑" : "백"} 승리! ${black}:${white}`);
    play(result === 1 ? "win" : mode === "ai" ? "lose" : "win");
    trackGameEvent("game_end", "othello", {
      result: result === "draw" ? "draw" : result === 1 ? "black" : "white",
      black,
      white,
      mode,
    });
  }, [mode, play]);

  const commitMove = useCallback((move: Move, player: PlayerDisc) => {
    if (winner) return;
    setHistory((items) => [
      ...items.slice(-(MAX_HISTORY - 1)),
      { board: cloneBoard(board), turn, winner, notice },
    ]);
    const next = applyMove(board, move, player);
    setBoard(next);
    play(move.flips.length >= 4 ? "capture" : "move");

    const opponent: PlayerDisc = player === 1 ? 2 : 1;
    const opponentMoves = validMoves(next, opponent);
    if (opponentMoves.length) {
      setTurn(opponent);
      setNotice(`${opponent === 1 ? "흑" : "백"} 차례입니다.`);
      return;
    }

    const ownMoves = validMoves(next, player);
    if (ownMoves.length) {
      setTurn(player);
      setNotice(`${opponent === 1 ? "흑" : "백"}이 둘 곳이 없어 한 차례 쉽니다.`);
      return;
    }

    finishGame(next);
  }, [board, finishGame, notice, play, turn, winner]);

  useEffect(() => {
    if (!hydrated || mode !== "ai" || turn !== 2 || winner) return;
    const timer = window.setTimeout(() => {
      const move = chooseAiMove(board);
      if (move) commitMove(move, 2);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [board, commitMove, hydrated, mode, turn, winner]);

  useEffect(() => {
    if (!hydrated) return;
    if (winner || movesPlayed === 0) {
      clearGameProgress("othello");
      return;
    }

    saveGameProgress<SavedOthelloState>({
      slug: "othello",
      title: "오셀로",
      theme: "forest",
      symbol: "● ○",
      summary: `${mode === "ai" ? "AI 대전" : "2인 대전"} · 흑 ${counts.black} : ${counts.white} 백 · ${turn === 1 ? "흑" : mode === "ai" ? "컴퓨터" : "백"} 차례`,
      state: {
        board: cloneBoard(board),
        turn,
        mode,
        winner,
        notice,
        history: history.slice(-MAX_HISTORY).map(cloneSnapshot),
      },
    });
  }, [board, counts.black, counts.white, history, hydrated, mode, movesPlayed, notice, turn, winner]);

  const undo = () => {
    if (!history.length) return;
    const steps = mode === "ai" && turn === 1 && history.length >= 2 ? 2 : 1;
    const index = Math.max(0, history.length - steps);
    const snapshot = history[index];
    setBoard(cloneBoard(snapshot.board));
    setTurn(snapshot.turn);
    setWinner(snapshot.winner);
    setNotice(snapshot.notice);
    setHistory((items) => items.slice(0, index));
    play("select");
  };

  const status = mode === "ai" && turn === 2 && !winner
    ? "컴퓨터가 모서리를 계산하는 중…"
    : `${notice}${hydrated && movesPlayed > 0 && !winner ? " 진행 상황은 자동 저장됩니다." : ""}`;

  return (
    <GameShell
      slug="othello"
      title="오셀로"
      kicker="뒤집기의 묘미"
      description="가능한 칸에 돌을 놓아 상대 돌을 양쪽에서 끼우고 내 색으로 뒤집으세요."
      theme="forest"
      status={<span className="status-inline"><i className="status-dot" />{status}</span>}
      score={
        <>
          <div className="score-chip"><span>흑</span><strong>{counts.black}</strong></div>
          <div className="score-chip"><span>백</span><strong>{counts.white}</strong></div>
          <div className="score-chip"><span>가능한 수</span><strong>{winner ? 0 : moves.length}</strong></div>
        </>
      }
      actions={
        <>
          <div className="segmented full-row" aria-label="대전 방식">
            <button type="button" className={mode === "ai" ? "is-active" : ""} onClick={() => { setMode("ai"); reset("ai"); trackGameEvent("game_mode_change", "othello", { mode: "ai" }); }}>AI 대전</button>
            <button type="button" className={mode === "2p" ? "is-active" : ""} onClick={() => { setMode("2p"); reset("2p"); trackGameEvent("game_mode_change", "othello", { mode: "2p" }); }}>같은 기기 2인</button>
          </div>
          <button type="button" className="control-button control-button--primary" onClick={() => reset()}>다시 시작</button>
          <button type="button" className="control-button" onClick={undo} disabled={!history.length}>무르기</button>
        </>
      }
      rules={
        <ul>
          <li>상대 돌을 가로·세로·대각선으로 끼울 수 있는 칸에만 놓습니다.</li>
          <li>끼인 상대 돌은 모두 내 색으로 뒤집힙니다.</li>
          <li>양쪽 모두 둘 곳이 없을 때 돌이 많은 쪽이 승리합니다.</li>
        </ul>
      }
      tip={<p>초반 돌 개수보다 모서리와 안정된 가장자리가 중요합니다. 모서리 바로 옆 칸은 신중하게 두세요.</p>}
    >
      <div className="othello-board" role="grid" aria-label="8×8 오셀로판">
        {board.flatMap((row, rowIndex) => row.map((disc, colIndex) => {
          const key = `${rowIndex},${colIndex}`;
          const valid = !winner && validKeys.has(key) && !(mode === "ai" && turn === 2);
          return (
            <button
              type="button"
              role="gridcell"
              aria-label={`${rowIndex + 1}행 ${colIndex + 1}열${disc === 1 ? " 흑돌" : disc === 2 ? " 백돌" : valid ? " 둘 수 있음" : " 빈칸"}`}
              className={`othello-cell${disc === 1 ? " black" : disc === 2 ? " white" : ""}${valid ? " valid" : ""}`}
              key={key}
              disabled={!valid}
              onClick={() => {
                const move = moves.find((item) => item.row === rowIndex && item.col === colIndex);
                if (move) commitMove(move, turn);
              }}
            />
          );
        }))}
      </div>
    </GameShell>
  );
}
