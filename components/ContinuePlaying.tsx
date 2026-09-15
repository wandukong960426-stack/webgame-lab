"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearGameProgress,
  GAME_PROGRESS_EVENT,
  listGameProgress,
  type GameProgressMeta,
} from "@/lib/game-progress";
import { trackGameEvent } from "@/lib/telemetry";

function relativeTime(timestamp: number) {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(timestamp);
}

export default function ContinuePlaying() {
  const [items, setItems] = useState<GameProgressMeta[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setItems(listGameProgress(3));
      setReady(true);
    };
    const handleStorage = () => refresh();

    refresh();
    window.addEventListener(GAME_PROGRESS_EVENT, refresh);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(GAME_PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!ready || !items.length) return null;

  return (
    <section className="resume-section" aria-labelledby="resume-title">
      <div className="resume-panel">
        <div className="resume-panel__heading">
          <div>
            <p className="eyebrow">자동 저장</p>
            <h2 id="resume-title">하던 판 이어하기</h2>
          </div>
          <span>이 기기의 브라우저에만 안전하게 저장됩니다.</span>
        </div>
        <div className="resume-grid">
          {items.map((item) => (
            <article className={`resume-card resume-card--${item.theme}`} key={item.slug}>
              <Link
                className="resume-card__link"
                href={item.href}
                onClick={() => trackGameEvent("game_resume", item.slug, { source: "home" })}
              >
                <span className="resume-card__symbol" aria-hidden="true">{item.symbol}</span>
                <span className="resume-card__copy">
                  <small>{relativeTime(item.updatedAt)} 저장</small>
                  <strong>{item.title}</strong>
                  <span>{item.summary}</span>
                </span>
                <b>계속하기 <span aria-hidden="true">→</span></b>
              </Link>
              <button
                type="button"
                className="resume-card__clear"
                onClick={() => {
                  clearGameProgress(item.slug);
                  setItems(listGameProgress(3));
                }}
                aria-label={`${item.title} 저장 기록 삭제`}
              >
                기록 삭제
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
