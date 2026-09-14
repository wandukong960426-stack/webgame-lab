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

type WakeLockLike = {
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockLike>;
  };
};

const SOUND_STORAGE_KEY = "ddanjitmoa:sound";

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

const vibrationProfile: Record<SoundKind, number | number[]> = {
  move: 8,
  capture: [12, 24, 18],
  merge: [8, 18, 12],
  win: [18, 38, 18, 38, 34],
  lose: [34, 28, 34],
  error: [22, 24, 22],
  select: 5,
};

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
      if (stored === "on" || stored === "off") setEnabled(stored === "on");
    } catch {
      // 사생활 보호 모드 등에서 localStorage 접근이 막혀도 게임은 계속 실행합니다.
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
      } catch {
        // 저장 실패 시 현재 세션에서만 설정을 유지합니다.
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (kind: SoundKind = "move") => {
      if (!enabled || typeof window === "undefined") return;

      if ("vibrate" in navigator) navigator.vibrate(vibrationProfile[kind]);

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
    () => ({ enabled, toggle, play }),
    [enabled, play, toggle],
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
  const wakeLockRef = useRef<WakeLockLike | null>(null);
  const audio = useGameAudio();
  const [theaterMode, setTheaterMode] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const focusMode = theaterMode || nativeFullscreen;

  useEffect(() => {
    trackGameEvent("game_start", slug);
  }, [slug]);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === shellRef.current;
      setNativeFullscreen(active);
      if (!active && document.fullscreenElement === null) {
        setTheaterMode(false);
        setControlsOpen(false);
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    if (focusMode) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, [focusMode]);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock) await lock.release().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!focusMode) {
      void releaseWakeLock();
      return;
    }

    const requestWakeLock = async () => {
      if (document.visibilityState !== "visible" || wakeLockRef.current) return;
      const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
      if (!wakeLock) return;
      wakeLockRef.current = await wakeLock.request("screen").catch(() => null);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
      else void releaseWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      void releaseWakeLock();
    };
  }, [focusMode, releaseWakeLock]);

  useEffect(() => {
    if (!controlsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setControlsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [controlsOpen]);

  const toggleFullscreen = async () => {
    const element = shellRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      setTheaterMode(false);
      setControlsOpen(false);
      trackGameEvent("game_fullscreen", slug, { active: false, native: true });
      return;
    }

    if (theaterMode) {
      setTheaterMode(false);
      setControlsOpen(false);
      trackGameEvent("game_fullscreen", slug, { active: false, native: false });
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

    setTheaterMode(true);
    trackGameEvent("game_fullscreen", slug, { active: true, native: false });
  };

  return (
    <section
      ref={shellRef}
      data-game={slug}
      className={`game-shell theme-${theme}${theaterMode ? " is-theater" : ""}`}
    >
      <div className="game-shell__topbar">
        <Link className="game-back" href="/games" aria-label="게임 목록으로 돌아가기">
          <span aria-hidden="true">←</span>
          <span>게임 목록</span>
        </Link>
        <div className="game-shell__utilities">
          {focusMode ? (
            <button
              type="button"
              className="utility-button theater-controls-toggle"
              onClick={() => setControlsOpen((current) => !current)}
              aria-expanded={controlsOpen}
              aria-controls="theater-game-controls"
              aria-label="전체화면 게임 조작 열기"
            >
              <span aria-hidden="true">🎮</span>
              <span>게임 조작</span>
            </button>
          ) : null}
          <button
            type="button"
            className="utility-button"
            onClick={audio.toggle}
            aria-pressed={audio.enabled}
            aria-label={audio.enabled ? "효과음과 진동 끄기" : "효과음과 진동 켜기"}
          >
            <span aria-hidden="true">{audio.enabled ? "🔊" : "🔇"}</span>
            <span>{audio.enabled ? "소리·진동 켬" : "소리·진동 끔"}</span>
          </button>
          <button
            type="button"
            className="utility-button utility-button--accent"
            onClick={() => void toggleFullscreen()}
            aria-pressed={focusMode}
            aria-label={focusMode ? "전체화면 플레이 종료" : "전체화면 플레이 시작"}
          >
            <span aria-hidden="true">{focusMode ? "↙" : "⛶"}</span>
            <span>{focusMode ? "전체화면 종료" : "전체화면"}</span>
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
          {!focusMode ? (
            <button type="button" className="mobile-play-cta" onClick={() => void toggleFullscreen()}>
              <span aria-hidden="true">⛶</span>
              <span>
                <strong>화면 가득 플레이</strong>
                <small>게임판을 최대로 키우고 화면 꺼짐을 방지합니다.</small>
              </span>
            </button>
          ) : null}
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

      {focusMode ? (
        <>
          <button
            type="button"
            className={`theater-drawer-backdrop${controlsOpen ? " is-open" : ""}`}
            onClick={() => setControlsOpen(false)}
            aria-label="게임 조작 닫기"
            tabIndex={controlsOpen ? 0 : -1}
          />
          <aside
            id="theater-game-controls"
            className={`theater-control-drawer${controlsOpen ? " is-open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} 전체화면 조작`}
            aria-hidden={!controlsOpen}
          >
            <div className="theater-control-drawer__header">
              <div>
                <span>전체화면 조작</span>
                <strong>{title}</strong>
              </div>
              <button type="button" onClick={() => setControlsOpen(false)} aria-label="게임 조작 닫기">×</button>
            </div>
            <div className="action-stack">{actions}</div>
          </aside>
        </>
      ) : null}
    </section>
  );
}
