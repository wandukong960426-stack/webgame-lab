"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { trackGameEvent } from "@/lib/telemetry";

export type SoundKind = "move" | "capture" | "merge" | "win" | "lose" | "error" | "select";

type AudioContextValue = {
  enabled: boolean;
  toggle: () => void;
  play: (kind?: SoundKind) => void;
};

const GameAudioContext = createContext<AudioContextValue>({
  enabled: true,
  toggle: () => undefined,
  play: () => undefined,
});

const soundProfile: Record<SoundKind, { start: number; end: number; duration: number; type: OscillatorType }> = {
  move: { start: 300, end: 220, duration: 0.08, type: "sine" },
  capture: { start: 180, end: 90, duration: 0.14, type: "triangle" },
  merge: { start: 420, end: 620, duration: 0.12, type: "sine" },
  win: { start: 520, end: 960, duration: 0.34, type: "triangle" },
  lose: { start: 240, end: 110, duration: 0.32, type: "sawtooth" },
  error: { start: 140, end: 120, duration: 0.08, type: "square" },
  select: { start: 560, end: 500, duration: 0.045, type: "sine" },
};

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(true);

  const play = useCallback(
    (kind: SoundKind = "move") => {
      if (!enabled || typeof window === "undefined") return;
      const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextCtor = window.AudioContext ?? webkitWindow.webkitAudioContext;
      if (!AudioContextCtor) return;

      const context = audioRef.current ?? new AudioContextCtor();
      audioRef.current = context;
      if (context.state === "suspended") void context.resume();

      const profile = soundProfile[kind];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = profile.type;
      oscillator.frequency.setValueAtTime(profile.start, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, profile.end), now + profile.duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === "win" ? 0.13 : 0.075, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + profile.duration + 0.02);
    },
    [enabled],
  );

  const value = useMemo<AudioContextValue>(
    () => ({ enabled, toggle: () => setEnabled((current) => !current), play }),
    [enabled, play],
  );

  useEffect(() => () => {
    if (audioRef.current) void audioRef.current.close();
  }, []);

  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useGameAudio() {
  return useContext(GameAudioContext);
}

type GameShellProps = {
  slug: string;
  title: string;
  kicker: string;
  description: string;
  theme: "wood" | "forest" | "neon" | "berry" | "royal" | "ink";
  status: ReactNode;
  score?: ReactNode;
  actions: ReactNode;
  rules: ReactNode;
  tip?: ReactNode;
  children: ReactNode;
};

export default function GameShell({
  slug,
  title,
  kicker,
  description,
  theme,
  status,
  score,
  actions,
  rules,
  tip,
  children,
}: GameShellProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const audio = useGameAudio();
  const [theaterMode, setTheaterMode] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);

  useEffect(() => {
    trackGameEvent("game_start", slug);
  }, [slug]);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === shellRef.current;
      setNativeFullscreen(active);
      if (!active && document.fullscreenElement === null) setTheaterMode(false);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (theaterMode || nativeFullscreen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [nativeFullscreen, theaterMode]);

  const toggleFullscreen = async () => {
    const element = shellRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      setTheaterMode(false);
      trackGameEvent("game_fullscreen", slug, { active: false, native: true });
      return;
    }

    if (element.requestFullscreen) {
      try {
        await element.requestFullscreen({ navigationUI: "hide" });
        setTheaterMode(true);
        trackGameEvent("game_fullscreen", slug, { active: true, native: true });
        return;
      } catch {
        // iOS Safari와 일부 인앱 브라우저에서는 요소 전체화면이 제한됩니다.
      }
    }

    setTheaterMode((value) => {
      const next = !value;
      trackGameEvent("game_fullscreen", slug, { active: next, native: false });
      return next;
    });
  };

  return (
    <section
      ref={shellRef}
      className={`game-shell theme-${theme}${theaterMode ? " is-theater" : ""}`}
    >
      <div className="game-shell__topbar">
        <Link className="game-back" href="/games" aria-label="게임 목록으로 돌아가기">
          <span aria-hidden="true">←</span>
          <span>게임 목록</span>
        </Link>
        <div className="game-shell__utilities">
          <button
            type="button"
            className="utility-button"
            onClick={audio.toggle}
            aria-pressed={audio.enabled}
            aria-label={audio.enabled ? "효과음 끄기" : "효과음 켜기"}
          >
            <span aria-hidden="true">{audio.enabled ? "🔊" : "🔇"}</span>
            <span>{audio.enabled ? "소리 켬" : "소리 끔"}</span>
          </button>
          <button
            type="button"
            className="utility-button utility-button--accent"
            onClick={() => void toggleFullscreen()}
            aria-pressed={theaterMode || nativeFullscreen}
          >
            <span aria-hidden="true">{theaterMode || nativeFullscreen ? "↙" : "⛶"}</span>
            <span>{theaterMode || nativeFullscreen ? "전체화면 종료" : "전체화면"}</span>
          </button>
        </div>
      </div>

      <div className="game-shell__heading">
        <div>
          <p className="eyebrow">{kicker}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {score ? <div className="game-score">{score}</div> : null}
      </div>

      <div className="game-shell__layout">
        <div className="game-play-column">
          <div className="game-status" role="status" aria-live="polite">
            {status}
          </div>
          <div className="game-board-frame">{children}</div>
        </div>

        <aside className="game-sidebar" aria-label={`${title} 조작과 규칙`}>
          <section className="game-panel game-actions">
            <h2>게임 조작</h2>
            <div className="action-stack">{actions}</div>
          </section>
          <section className="game-panel game-rules">
            <h2>규칙</h2>
            {rules}
          </section>
          {tip ? (
            <section className="game-panel game-tip">
              <h2>한 수 팁</h2>
              {tip}
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
