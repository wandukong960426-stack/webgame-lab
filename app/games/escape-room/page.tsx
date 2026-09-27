"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import GameShell, { useGameAudio } from "@/components/GameShell";
import TelescopeView from "@/components/escape-room/TelescopeView";
import { EscapeAudio } from "@/components/escape-room/audio";
import type { EscapeSceneHandle, Quality } from "@/components/escape-room/scene";
import {
  CHALLENGE_LIMIT_MS,
  FINAL_STAGE,
  HINTS,
  HOTSPOT_BY_ID,
  ITEMS,
  JOURNAL_PAGES,
  KEYPAD_ORDER,
  STAGE_COUNT,
  STAGE_TITLES,
  VIEW_LABELS,
  createInitialState,
  escapeReducer,
  formatClock,
  hotspotLabel,
  isEscapeState,
  listHotspots,
  rankFor,
  stageOf,
  type EscapeMode,
  type EscapeState,
  type HotspotId,
  type ViewId,
} from "@/lib/escape-room/puzzle";
import { clearGameProgress, loadGameProgress, saveGameProgress } from "@/lib/game-progress";
import { trackGameEvent } from "@/lib/telemetry";

type Phase = "intro" | "playing" | "paused" | "timeup" | "ended";
type SceneStatus = "loading" | "ready" | "fallback" | "lost";
type QualitySetting = "auto" | Quality;
type Toast = { id: number; text: string; tone: string };

const SLUG = "escape-room";
const MUSIC_KEY = "ddanjitmoa:escape-room:music";
const QUALITY_KEY = "ddanjitmoa:escape-room:quality";
const NAV_VIEWS: ViewId[] = ["door", "wall", "desk", "shelf", "chest", "painting", "telescope"];

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function autoQuality(): Quality {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  return coarse || cores <= 4 ? "low" : "high";
}

function readPref(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 설정 저장이 막혀도 현재 세션에서는 그대로 유지합니다.
  }
}

export default function EscapeRoomPage() {
  const platformAudio = useGameAudio();
  const [state, dispatch] = useReducer(escapeReducer, undefined, () => createInitialState("relaxed"));
  const [phase, setPhase] = useState<Phase>("intro");
  const [view, setView] = useState<ViewId>("overview");
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>("loading");
  const [sceneKey, setSceneKey] = useState(0);
  const [saved, setSaved] = useState<EscapeState | null>(null);
  const [introMode, setIntroMode] = useState<EscapeMode>("relaxed");
  const [toast, setToast] = useState<Toast | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalPage, setJournalPage] = useState(0);
  const [telescopeOpen, setTelescopeOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [music, setMusic] = useState(true);
  const [qualitySetting, setQualitySetting] = useState<QualitySetting>("auto");
  const [activeQuality, setActiveQuality] = useState<Quality>("high");
  const [reducedMotion, setReducedMotion] = useState(false);

  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<EscapeSceneHandle | null>(null);
  const audioRef = useRef<EscapeAudio | null>(null);
  const stateRef = useRef(state);
  const viewRef = useRef(view);
  const phaseRef = useRef(phase);
  const hotspotRef = useRef<(id: HotspotId) => void>(() => undefined);
  const saveKeyRef = useRef("");
  const snapRef = useRef(false);

  stateRef.current = state;
  viewRef.current = view;
  phaseRef.current = phase;

  const stage = stageOf(state);
  const audio = () => {
    if (!audioRef.current) audioRef.current = new EscapeAudio();
    return audioRef.current;
  };

  // ---------- 초기화: 저장 기록, 환경 설정 ----------
  useEffect(() => {
    const record = loadGameProgress<unknown>(SLUG);
    if (record && isEscapeState(record.state) && !record.state.flags.doorOpen) {
      setSaved(record.state);
      setIntroMode(record.state.mode);
    } else if (record) {
      clearGameProgress(SLUG);
    }
    setMusic(readPref(MUSIC_KEY) !== "off");
    const storedQuality = readPref(QUALITY_KEY);
    const quality = storedQuality === "high" || storedQuality === "low" ? storedQuality : "auto";
    setQualitySetting(quality);
    setActiveQuality(quality === "auto" ? autoQuality() : quality);
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReducedMotion(Boolean(motion?.matches));
    const onMotion = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    motion?.addEventListener?.("change", onMotion);
    return () => {
      motion?.removeEventListener?.("change", onMotion);
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  // ---------- 3D 장면 생성 (코드 분할 + 실패 시 텍스트 모드) ----------
  const activeQualityRef = useRef(activeQuality);
  activeQualityRef.current = activeQuality;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const host = sceneHostRef.current;
    if (!host) return;
    let cancelled = false;
    let handle: EscapeSceneHandle | null = null;
    setSceneStatus("loading");
    if (!supportsWebGL2()) {
      setSceneStatus("fallback");
      return;
    }
    import("@/components/escape-room/scene")
      .then(({ createEscapeScene }) => {
        if (cancelled) return;
        try {
          handle = createEscapeScene(
            host,
            {
              onHotspot: (id) => hotspotRef.current(id),
              onUVReveal: () => dispatch({ type: "revealMoon" }),
              onBack: () => setView("overview"),
              onQuality: (quality) => setActiveQuality(quality),
              onContextLost: () => setSceneStatus("lost"),
            },
            { quality: activeQualityRef.current, reducedMotion: reducedMotionRef.current },
          );
          sceneRef.current = handle;
          handle.sync(stateRef.current, viewRef.current);
          setSceneStatus("ready");
        } catch (error) {
          console.error("[escape-room] 3D scene failed", error);
          handle?.dispose();
          handle = null;
          setSceneStatus("fallback");
        }
      })
      .catch((error) => {
        console.error("[escape-room] scene module failed", error);
        if (!cancelled) setSceneStatus("fallback");
      });
    return () => {
      cancelled = true;
      handle?.dispose();
      sceneRef.current = null;
    };
  }, [sceneKey]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.sync(state, view, snapRef.current);
    snapRef.current = false;
  }, [state, view, sceneStatus]);

  useEffect(() => {
    sceneRef.current?.setPaused(phase === "paused" || phase === "timeup" || telescopeOpen);
  }, [phase, telescopeOpen, sceneStatus]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion, sceneStatus]);

  useEffect(() => {
    sceneRef.current?.setQuality(activeQuality);
  }, [activeQuality, sceneStatus]);

  // ---------- 소리 ----------
  useEffect(() => {
    audioRef.current?.setEnabled(platformAudio.enabled);
  }, [platformAudio.enabled]);

  useEffect(() => {
    audioRef.current?.setMusic(music);
  }, [music]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") audioRef.current?.suspend();
      else audioRef.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ---------- 조작 ----------
  const handleHotspot = useCallback(
    (id: HotspotId) => {
      if (phaseRef.current !== "playing") return;
      const def = HOTSPOT_BY_ID.get(id);
      if (!def) return;
      if (def.view && def.view !== viewRef.current) setView(def.view);
      dispatch({ type: "interact", hotspot: id });
    },
    [],
  );
  hotspotRef.current = handleHotspot;

  const goBack = useCallback(() => setView("overview"), []);

  // 사건(이벤트)에 따른 소리·토스트·오버레이
  const eventId = state.event?.id;
  useEffect(() => {
    const event = stateRef.current.event;
    if (!event) return;
    audioRef.current?.play(event.sound);
    setToast({ id: event.id, text: event.text, tone: event.tone });
    if (event.tone === "success" && platformAudio.enabled && "vibrate" in navigator) navigator.vibrate([12, 30, 18]);
    if (event.open === "journal") {
      setJournalPage(Math.max(0, stateRef.current.journalPages - 1));
      setJournalOpen(true);
    }
    if (event.open !== "telescope") return;
    const timer = window.setTimeout(() => setTelescopeOpen(true), 550);
    return () => window.clearTimeout(timer);
  }, [eventId]);

  // 토스트는 글 길이에 맞춰 잠시 보였다가 사라짐
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      Math.max(3800, toast.text.length * 90),
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 문이 열리면 엔딩
  const doorOpen = state.flags.doorOpen;
  useEffect(() => {
    if (!doorOpen || phaseRef.current !== "playing") return;
    const current = stateRef.current;
    clearGameProgress(SLUG);
    setSaved(null);
    trackGameEvent("game_end", SLUG, {
      result: "escaped",
      mode: current.mode,
      seconds: Math.round(current.elapsedMs / 1000),
      hints: current.hintsUsed,
    });
    setHintOpen(false);
    const timer = window.setTimeout(() => {
      setPhase("ended");
      audioRef.current?.play("success");
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [doorOpen]);

  // 시간 흐름 (보이는 동안만)
  useEffect(() => {
    if (phase !== "playing") return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      if (document.visibilityState === "visible" && !telescopeOpen) dispatch({ type: "tick", deltaMs: delta });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, telescopeOpen]);

  // 도전 모드 시간 초과
  useEffect(() => {
    if (phase !== "playing" || state.mode !== "challenge" || state.timeUpShown || state.flags.doorOpen) return;
    if (state.elapsedMs >= CHALLENGE_LIMIT_MS) {
      dispatch({ type: "timeUpShown" });
      setTelescopeOpen(false);
      setJournalOpen(false);
      setPhase("timeup");
      audioRef.current?.play("locked");
    }
  }, [phase, state.elapsedMs, state.mode, state.timeUpShown, state.flags.doorOpen]);

  // 진행이 멈추면 부드럽게 힌트를 권함 (자동으로 답을 보여주지는 않음)
  useEffect(() => {
    if (phase !== "playing" || stage >= FINAL_STAGE || state.nudgedStage === stage) return;
    const threshold = state.mode === "challenge" ? 90_000 : 120_000;
    if (state.elapsedMs - state.lastProgressMs > threshold && state.hintLevels[stage] < HINTS[stage].length) {
      setNudge(true);
      dispatch({ type: "nudged" });
      audioRef.current?.play("hint");
    }
  }, [phase, stage, state.elapsedMs, state.lastProgressMs, state.mode, state.nudgedStage, state.hintLevels]);

  useEffect(() => {
    setNudge(false);
  }, [stage]);

  // 자동 저장
  useEffect(() => {
    if (phase === "intro" || phase === "ended" || state.flags.doorOpen) return;
    const key = JSON.stringify({ ...state, event: null, elapsedMs: Math.floor(state.elapsedMs / 5000) });
    if (key === saveKeyRef.current) return;
    saveKeyRef.current = key;
    saveGameProgress<EscapeState>({
      slug: SLUG,
      title: "방탈출: 별지기의 서재",
      theme: "midnight",
      symbol: "🗝️",
      summary: `${Math.min(stage, STAGE_COUNT)}/${STAGE_COUNT}단계 · ${formatClock(state.elapsedMs)} 경과`,
      state: { ...state, event: null },
    });
  }, [phase, stage, state]);

  // 키보드
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (telescopeOpen) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "Escape") {
        if (journalOpen) setJournalOpen(false);
        else if (hintOpen) setHintOpen(false);
        else if (phaseRef.current === "playing" && viewRef.current !== "overview") setView("overview");
        return;
      }
      if (phaseRef.current !== "playing" || journalOpen) return;
      const inStage = !target || target === document.body || Boolean(stageRef.current?.contains(target) && target.tagName !== "BUTTON");
      if (event.key === "h" || event.key === "H") {
        setHintOpen((open) => !open);
        setNudge(false);
        return;
      }
      if (!inStage) return;
      if (viewRef.current === "overview") {
        const look: Record<string, [number, number]> = {
          ArrowLeft: [0.4, 0],
          ArrowRight: [-0.4, 0],
          ArrowUp: [0, 0.18],
          ArrowDown: [0, -0.18],
        };
        const delta = look[event.key];
        if (delta) {
          event.preventDefault();
          sceneRef.current?.look(delta[0], delta[1]);
        }
      } else if (viewRef.current === "door") {
        if (/^[0-9]$/.test(event.key)) {
          event.preventDefault();
          handleHotspot(`key-${event.key}` as HotspotId);
        } else if (event.key === "Backspace") {
          event.preventDefault();
          handleHotspot("key-clear");
        } else if (event.key === "Enter") {
          event.preventDefault();
          handleHotspot("key-enter");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleHotspot, hintOpen, journalOpen, telescopeOpen]);

  // ---------- 진행 제어 ----------
  const startNew = (mode: EscapeMode) => {
    audio().start();
    audio().setEnabled(platformAudio.enabled);
    audio().setMusic(music);
    clearGameProgress(SLUG);
    saveKeyRef.current = "";
    setSaved(null);
    snapRef.current = true;
    dispatch({ type: "reset", mode });
    setView("overview");
    setHintOpen(false);
    setJournalOpen(false);
    setTelescopeOpen(false);
    setToast({ id: -1, text: "문이 잠겨 있다. 방을 천천히 둘러보자.", tone: "info" });
    setPhase("playing");
    trackGameEvent("game_restart", SLUG, { mode });
    window.setTimeout(() => stageRef.current?.focus({ preventScroll: true }), 50);
  };

  const resumeSaved = () => {
    if (!saved) return;
    audio().start();
    audio().setEnabled(platformAudio.enabled);
    audio().setMusic(music);
    snapRef.current = true;
    dispatch({ type: "restore", state: saved });
    setView("overview");
    setToast({ id: -2, text: "서재로 돌아왔다. 멈췄던 곳부터 다시 이어 간다.", tone: "info" });
    setPhase("playing");
    trackGameEvent("game_resume", SLUG, { stage: stageOf(saved), seconds: Math.round(saved.elapsedMs / 1000) });
    window.setTimeout(() => stageRef.current?.focus({ preventScroll: true }), 50);
  };

  const toIntro = () => {
    setTelescopeOpen(false);
    setJournalOpen(false);
    setHintOpen(false);
    const record = loadGameProgress<unknown>(SLUG);
    setSaved(record && isEscapeState(record.state) && !record.state.flags.doorOpen ? record.state : null);
    setPhase("intro");
  };

  const toggleMusic = () => {
    setMusic((current) => {
      const next = !current;
      writePref(MUSIC_KEY, next ? "on" : "off");
      return next;
    });
  };

  const chooseQuality = (setting: QualitySetting) => {
    setQualitySetting(setting);
    writePref(QUALITY_KEY, setting);
    setActiveQuality(setting === "auto" ? autoQuality() : setting);
  };

  const requestHint = () => {
    setNudge(false);
    if (!hintOpen) {
      setHintOpen(true);
      if ((state.hintLevels[stage] ?? 0) === 0) dispatch({ type: "hint" });
      return;
    }
    setHintOpen(false);
  };

  const onTelescopeFound = useCallback(() => dispatch({ type: "telescopeFound" }), []);
  const closeTelescope = useCallback(() => {
    setTelescopeOpen(false);
    window.setTimeout(() => stageRef.current?.focus({ preventScroll: true }), 30);
  }, []);

  // ---------- 표시 ----------
  const remaining = Math.max(0, CHALLENGE_LIMIT_MS - state.elapsedMs);
  const hotspots = useMemo(() => listHotspots(view, state), [view, state]);
  const revealedHints = HINTS[stage].slice(0, state.hintLevels[stage] ?? 0);
  const moreHints = (state.hintLevels[stage] ?? 0) < HINTS[stage].length;
  const statusText =
    phase === "intro"
      ? "모드를 고르고 서재에 들어가세요."
      : phase === "ended"
        ? "탈출 성공! 기록을 확인하세요."
        : toast?.text ?? `지금 보는 곳: ${VIEW_LABELS[view]}`;

  const explorationList = (
    <div className="escape-explore" aria-label="조사할 수 있는 곳">
      {view === "door" && state.flags.powerOn && !state.flags.doorOpen ? (
        <div className="escape-keypad" role="group" aria-label="도어락 숫자판">
          <output aria-live="polite">{state.flags.keypadEntry.padEnd(4, "·")}</output>
          {KEYPAD_ORDER.map((id) => (
            <button type="button" key={id} onClick={() => handleHotspot(id)} disabled={phase !== "playing"} aria-label={hotspotLabel(id, state)}>
              {id === "key-clear" ? "C" : id === "key-enter" ? "✓" : id.slice(4)}
            </button>
          ))}
        </div>
      ) : null}
      <ul>
        {hotspots.map((def) => (
          <li key={def.id}>
            <button type="button" onClick={() => handleHotspot(def.id)} disabled={phase !== "playing"}>
              {hotspotLabel(def.id, state)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <GameShell
      slug={SLUG}
      title="방탈출: 별지기의 서재"
      kicker="3D 추리 방탈출 · 에피소드 1"
      description="달빛만 스며드는 천문학자의 서재에 갇혔습니다. 흩어진 단서를 잇고 장치를 되살려, 문이 기억하는 숫자를 찾아 탈출하세요."
      theme="midnight"
      status={
        <span className="status-inline">
          <i className="status-dot" />
          {statusText}
        </span>
      }
      score={
        <>
          <div className="score-chip">
            <span>진행</span>
            <strong>
              {Math.min(stage, STAGE_COUNT)}/{STAGE_COUNT}
            </strong>
          </div>
          <div className="score-chip">
            <span>{state.mode === "challenge" ? "남은 시간" : "경과 시간"}</span>
            <strong>{formatClock(state.mode === "challenge" ? remaining : state.elapsedMs)}</strong>
          </div>
          <div className="score-chip">
            <span>힌트</span>
            <strong>{state.hintsUsed}</strong>
          </div>
        </>
      }
      actions={
        <>
          {phase === "playing" ? (
            <>
              <p className="escape-actions__label full-row">
                지금 보는 곳: <strong>{VIEW_LABELS[view]}</strong>
              </p>
              {view !== "overview" ? (
                <button type="button" className="control-button full-row" onClick={goBack}>
                  ← 방 전체 보기
                </button>
              ) : null}
              <div className="escape-nav full-row" role="group" aria-label="장소 이동">
                {NAV_VIEWS.map((id) => (
                  <button type="button" key={id} className={view === id ? "is-active" : undefined} onClick={() => setView(id)} aria-pressed={view === id}>
                    {VIEW_LABELS[id]}
                  </button>
                ))}
              </div>
              <div className="full-row">{explorationList}</div>
              <button type="button" className="control-button full-row" onClick={requestHint}>
                💡 별지기의 메모 (힌트)
              </button>
              <button type="button" className="control-button" onClick={() => setPhase("paused")}>
                일시정지
              </button>
            </>
          ) : null}
          <button type="button" className="control-button control-button--primary" onClick={toIntro}>
            {phase === "intro" ? "처음 화면" : "새로 시작"}
          </button>
          <div className="segmented segmented--three full-row" role="group" aria-label="그래픽 품질">
            {(["auto", "high", "low"] as QualitySetting[]).map((setting) => (
              <button type="button" key={setting} className={qualitySetting === setting ? "is-active" : undefined} onClick={() => chooseQuality(setting)} aria-pressed={qualitySetting === setting}>
                {setting === "auto" ? "자동" : setting === "high" ? "고화질" : "저사양"}
              </button>
            ))}
          </div>
          <button type="button" className="control-button full-row" onClick={toggleMusic} aria-pressed={music}>
            {music ? "♪ 배경음 켬" : "♪ 배경음 끔"}
          </button>
        </>
      }
      rules={
        <ul>
          <li>드래그(스와이프)로 방을 둘러보고, 금빛 테두리가 생기는 물건을 눌러 조사합니다.</li>
          <li>필요한 물건을 가지고 있으면 대상을 누를 때 자동으로 사용됩니다.</li>
          <li>UV 손전등과 일지는 화면 아래 소지품에서 눌러 사용합니다.</li>
          <li>막히면 💡 힌트: 살짝 → 구체적으로 → 거의 정답, 3단계로 열리며 벌점은 없습니다.</li>
          <li>여유 모드는 시간 제한이 없고, 도전 모드는 30분 안에 탈출해야 합니다.</li>
          <li>진행 상황은 이 기기의 브라우저에 자동 저장됩니다. Esc: 뒤로 · H: 힌트</li>
        </ul>
      }
      tip={<p>처음 본 장식도 가볍게 넘기지 마세요. 이 방의 모든 단서는 결국 하나로 이어집니다.</p>}
    >
      <div
        ref={stageRef}
        className={`escape-stage${phase === "playing" ? " is-playing" : ""}`}
        tabIndex={0}
        aria-label={`방탈출 3D 화면 — ${VIEW_LABELS[view]}. 조작 패널의 조사 목록으로도 진행할 수 있습니다.`}
      >
        <div ref={sceneHostRef} className="escape-canvas-host" key={sceneKey} />

        {sceneStatus === "loading" ? (
          <div className="escape-loading" aria-live="polite">
            <span className="escape-loading__moon" aria-hidden="true" />
            서재를 불러오는 중…
          </div>
        ) : null}

        {sceneStatus === "fallback" || sceneStatus === "lost" ? (
          <div className="escape-fallback">
            <strong>{sceneStatus === "lost" ? "그래픽이 잠시 멈췄어요" : "텍스트 탐색 모드"}</strong>
            <p>
              {sceneStatus === "lost"
                ? "기기 그래픽 메모리가 초기화되었습니다. 진행 상황은 그대로 남아 있어요."
                : "이 브라우저에서는 3D 그래픽(WebGL 2)을 사용할 수 없어, 목록으로 조사하며 진행합니다."}
            </p>
            {sceneStatus === "lost" ? (
              <button type="button" className="escape-btn" onClick={() => setSceneKey((key) => key + 1)}>
                3D 다시 불러오기
              </button>
            ) : null}
            {phase === "playing" ? (
              <>
                {toast ? (
                  <p className="escape-fallback__message" aria-hidden="true">
                    {toast.text}
                  </p>
                ) : null}
                <div className="escape-nav" role="group" aria-label="장소 이동">
                  <button type="button" className={view === "overview" ? "is-active" : undefined} onClick={() => setView("overview")}>
                    {VIEW_LABELS.overview}
                  </button>
                  {NAV_VIEWS.map((id) => (
                    <button type="button" key={id} className={view === id ? "is-active" : undefined} onClick={() => setView(id)}>
                      {VIEW_LABELS[id]}
                    </button>
                  ))}
                </div>
                {explorationList}
              </>
            ) : null}
          </div>
        ) : null}

        {phase === "playing" || phase === "paused" || phase === "timeup" ? (
          <div className="escape-hud">
            <div className="escape-hud__top">
              <div className="escape-hud__group">
                {view !== "overview" ? (
                  <button type="button" className="escape-btn escape-btn--round" onClick={goBack} aria-label="방 전체 보기로 돌아가기">
                    ←
                  </button>
                ) : null}
                <span className="escape-chip">{VIEW_LABELS[view]}</span>
              </div>
              <div className="escape-hud__group">
                {state.mode === "challenge" ? (
                  <span className={`escape-chip escape-chip--timer${remaining < 5 * 60_000 ? " is-urgent" : ""}`} aria-label={`남은 시간 ${formatClock(remaining)}`}>
                    ⏳ {formatClock(remaining)}
                  </span>
                ) : null}
                <button type="button" className={`escape-btn escape-btn--round${nudge ? " is-nudging" : ""}`} onClick={requestHint} aria-label="별지기의 메모(힌트) 열기" aria-expanded={hintOpen}>
                  💡
                </button>
                <button type="button" className="escape-btn escape-btn--round" onClick={() => setPhase("paused")} aria-label="일시정지">
                  ❚❚
                </button>
              </div>
            </div>

            <ol className="escape-progress" aria-label={`진행 ${Math.min(stage, STAGE_COUNT)}/${STAGE_COUNT}단계`}>
              {Array.from({ length: STAGE_COUNT }, (_, index) => (
                <li key={index} className={index < stage ? "is-done" : index === stage ? "is-current" : undefined} />
              ))}
            </ol>

            {nudge && !hintOpen ? (
              <button type="button" className="escape-nudge" onClick={requestHint}>
                막혔나요? 💡 별지기의 메모를 펼쳐 보세요
              </button>
            ) : null}

            {toast && !hintOpen && sceneStatus === "ready" ? (
              <p key={toast.id} className={`escape-toast escape-toast--${toast.tone}`} aria-hidden="true">
                {toast.text}
              </p>
            ) : null}

            <div className="escape-inventory" role="toolbar" aria-label="소지품">
              {state.inventory.length === 0 ? <span className="escape-inventory__empty">소지품 없음</span> : null}
              {state.inventory.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`escape-slot${item === "uvLight" && state.flags.uvOn ? " is-on" : ""}`}
                  onClick={() => dispatch({ type: "useItem", item })}
                  aria-pressed={item === "uvLight" ? state.flags.uvOn : undefined}
                  title={ITEMS[item].description}
                >
                  <span aria-hidden="true">{ITEMS[item].icon}</span>
                  <small>{item === "uvLight" ? (state.flags.uvOn ? "UV 켬" : "UV 끔") : ITEMS[item].name}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {hintOpen && phase === "playing" ? (
          <section className="escape-panel escape-hints" aria-label="별지기의 메모">
            <header>
              <div>
                <small>
                  지금 목표 · {Math.min(stage + 1, STAGE_COUNT)}/{STAGE_COUNT}
                </small>
                <strong>{STAGE_TITLES[stage]}</strong>
              </div>
              <button type="button" className="escape-btn escape-btn--round" onClick={() => setHintOpen(false)} aria-label="힌트 닫기">
                ×
              </button>
            </header>
            <ol>
              {revealedHints.map((hint, index) => (
                <li key={index}>
                  <span>{["살짝", "구체적으로", "거의 정답"][index] ?? "메모"}</span>
                  {hint}
                </li>
              ))}
            </ol>
            {moreHints && stage < FINAL_STAGE ? (
              <button type="button" className="escape-btn" onClick={() => dispatch({ type: "hint" })}>
                다음 메모 펼치기 ({(state.hintLevels[stage] ?? 0) + 1}/{HINTS[stage].length})
              </button>
            ) : null}
            <p className="escape-hints__note">힌트는 벌점 없이 기록에만 남아요. 편하게 펼쳐 보세요.</p>
          </section>
        ) : null}

        {journalOpen ? (
          <section className="escape-overlay escape-journal" role="dialog" aria-modal="true" aria-label="관측 일지">
            <article className="escape-journal__page">
              <h2>{JOURNAL_PAGES[journalPage]?.title}</h2>
              {JOURNAL_PAGES[journalPage]?.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <footer>
                {state.journalPages > 1 ? (
                  <div className="escape-journal__tabs" role="group" aria-label="일지 쪽 선택">
                    {JOURNAL_PAGES.slice(0, state.journalPages).map((page, index) => (
                      <button type="button" key={page.title} className={index === journalPage ? "is-active" : undefined} onClick={() => setJournalPage(index)} aria-pressed={index === journalPage}>
                        {index + 1}쪽
                      </button>
                    ))}
                  </div>
                ) : (
                  <span />
                )}
                <button type="button" className="escape-btn" onClick={() => setJournalOpen(false)} autoFocus>
                  일지 덮기
                </button>
              </footer>
            </article>
          </section>
        ) : null}

        {telescopeOpen ? (
          <TelescopeView found={state.flags.telescopeFound} onFound={onTelescopeFound} onClose={closeTelescope} reducedMotion={reducedMotion} />
        ) : null}

        {phase === "intro" ? (
          <section className="escape-overlay escape-intro" aria-labelledby="escape-intro-title">
            <div className="escape-intro__card">
              <p className="escape-eyebrow">EPISODE 1 · 3D 방탈출</p>
              <h2 id="escape-intro-title">별지기의 서재</h2>
              <p className="escape-intro__story">
                한별 교수가 사라진 지 사흘째. 조수인 당신은 교수의 천문대 서재에서 눈을 떴습니다. 문은 잠겨 있고, 둥근 창 너머로
                달이 떠 있습니다. 교수는 늘 말했죠. <em>“별은 선으로 이어질 때 비로소 이야기가 된다.”</em>
              </p>
              <div className="escape-modes" role="radiogroup" aria-label="플레이 모드">
                <button type="button" role="radio" aria-checked={introMode === "relaxed"} className={introMode === "relaxed" ? "is-active" : undefined} onClick={() => setIntroMode("relaxed")}>
                  <strong>여유 모드</strong>
                  <span>시간 제한 없이, 언제든 멈추고 천천히</span>
                </button>
                <button type="button" role="radio" aria-checked={introMode === "challenge"} className={introMode === "challenge" ? "is-active" : undefined} onClick={() => setIntroMode("challenge")}>
                  <strong>도전 모드 · 30:00</strong>
                  <span>타이머가 흐르는 긴장감 있는 탈출</span>
                </button>
              </div>
              <div className="escape-intro__actions">
                <button type="button" className="escape-btn escape-btn--primary" onClick={() => startNew(introMode)}>
                  {saved ? "처음부터 입장" : "서재에 들어가기"}
                </button>
                {saved ? (
                  <button type="button" className="escape-btn" onClick={resumeSaved}>
                    이어하기 · {Math.min(stageOf(saved), STAGE_COUNT)}/{STAGE_COUNT}단계 · {formatClock(saved.elapsedMs)}
                  </button>
                ) : null}
              </div>
              <ul className="escape-intro__controls" aria-label="조작 방법">
                <li>드래그 · 스와이프로 둘러보기</li>
                <li>클릭 · 탭으로 조사</li>
                <li>Esc 뒤로 · H 힌트</li>
                <li>🎧 소리를 켜면 더 깊이 몰입돼요</li>
              </ul>
            </div>
          </section>
        ) : null}

        {phase === "paused" ? (
          <section className="escape-overlay escape-dialog" role="dialog" aria-modal="true" aria-labelledby="escape-pause-title">
            <div className="escape-dialog__card">
              <h2 id="escape-pause-title">잠시 멈춤</h2>
              <p>
                {STAGE_TITLES[stage]} · {formatClock(state.elapsedMs)} 경과 · 힌트 {state.hintsUsed}회
              </p>
              <button type="button" className="escape-btn escape-btn--primary" onClick={() => setPhase("playing")} autoFocus>
                계속하기
              </button>
              {state.mode === "challenge" ? (
                <button
                  type="button"
                  className="escape-btn"
                  onClick={() => {
                    dispatch({ type: "setMode", mode: "relaxed" });
                    setPhase("playing");
                  }}
                >
                  여유 모드로 바꾸기
                </button>
              ) : null}
              <button type="button" className="escape-btn escape-btn--ghost" onClick={toIntro}>
                처음 화면으로
              </button>
            </div>
          </section>
        ) : null}

        {phase === "timeup" ? (
          <section className="escape-overlay escape-dialog" role="dialog" aria-modal="true" aria-labelledby="escape-timeup-title">
            <div className="escape-dialog__card">
              <h2 id="escape-timeup-title">30분이 지났어요</h2>
              <p>문은 아직 잠겨 있지만 서재는 여전히 당신을 기다립니다. 지금까지의 진행은 그대로예요.</p>
              <button
                type="button"
                className="escape-btn escape-btn--primary"
                onClick={() => {
                  dispatch({ type: "setMode", mode: "relaxed" });
                  setPhase("playing");
                }}
                autoFocus
              >
                여유 모드로 계속 탐험
              </button>
              <button type="button" className="escape-btn escape-btn--ghost" onClick={() => startNew("challenge")}>
                도전 모드 처음부터
              </button>
            </div>
          </section>
        ) : null}

        {phase === "ended" ? (
          <section className="escape-overlay escape-ending" aria-labelledby="escape-ending-title">
            <div className="escape-dialog__card escape-ending__card">
              <p className="escape-eyebrow">ESCAPED</p>
              <h2 id="escape-ending-title">탈출 성공!</h2>
              <p className="escape-ending__story">
                문 너머 계단 끝, 옥상 천문대의 망원경 옆에 쪽지 한 장이 놓여 있습니다. <em>“역시 자네라면 풀 줄 알았네. 다음 관측은 함께하지. — 한별”</em>
              </p>
              <dl className="escape-stats">
                <div>
                  <dt>탈출 시간</dt>
                  <dd>{formatClock(state.elapsedMs)}</dd>
                </div>
                <div>
                  <dt>힌트</dt>
                  <dd>{state.hintsUsed}회</dd>
                </div>
                <div>
                  <dt>오답</dt>
                  <dd>{state.wrongAttempts}회</dd>
                </div>
                <div>
                  <dt>등급</dt>
                  <dd>{rankFor(state)}</dd>
                </div>
              </dl>
              <div className="escape-intro__actions">
                <button type="button" className="escape-btn escape-btn--primary" onClick={toIntro}>
                  다시 도전하기
                </button>
                <Link className="escape-btn" href="/games">
                  다른 게임 보기
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </GameShell>
  );
}
