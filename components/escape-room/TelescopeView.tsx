"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOOKS } from "@/lib/escape-room/puzzle";

type Props = {
  found: boolean;
  onFound: () => void;
  onClose: () => void;
  reducedMotion: boolean;
};

// 별자리 좌표(하늘 좌표계, px). 가장 밝은 파란 별에서 시작해 선을 따라가면 책 순서가 됩니다.
const TARGET = { x: 760, y: -430 };
const CONSTELLATION = [
  { book: 3, x: 0, y: 0, r: 9 },
  { book: 0, x: -130, y: 70, r: 5.5 },
  { book: 4, x: -60, y: 175, r: 5 },
  { book: 1, x: 95, y: 150, r: 5.5 },
  { book: 2, x: 120, y: 30, r: 5 },
];
const FIELD = 1600;

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const random = seeded(4242);
const STARS = Array.from({ length: 900 }, () => ({
  x: (random() - 0.5) * FIELD * 2,
  y: (random() - 0.5) * FIELD * 2,
  r: random() ** 3 * 2.2 + 0.4,
  a: 0.35 + random() * 0.6,
  t: random() * Math.PI * 2,
}));

export default function TelescopeView({ found, onFound, onClose, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const foundRef = useRef(found);
  const [focusHint, setFocusHint] = useState("화면을 끌거나 방향키로 망원경을 움직여 보세요.");

  useEffect(() => {
    foundRef.current = found;
  }, [found]);

  const move = useCallback((dx: number, dy: number) => {
    target.current.x = Math.max(-FIELD, Math.min(FIELD, target.current.x + dx));
    target.current.y = Math.max(-FIELD, Math.min(FIELD, target.current.y + dy));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let time = 0;
    let last = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      time += dt;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const k = reducedMotion ? 1 : 1 - Math.exp(-8 * dt);
      offset.current.x += (target.current.x - offset.current.x) * k;
      offset.current.y += (target.current.y - offset.current.y) * k;

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.46;
      const scale = radius / 330;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      sky.addColorStop(0, "#0d1a3a");
      sky.addColorStop(1, "#040814");
      ctx.fillStyle = sky;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-offset.current.x, -offset.current.y);

      STARS.forEach((star) => {
        const twinkle = reducedMotion ? 1 : 0.75 + Math.sin(time * 2 + star.t) * 0.25;
        ctx.fillStyle = `rgba(225,232,255,${star.a * twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.translate(TARGET.x, TARGET.y);
      ctx.strokeStyle = "rgba(210,220,255,0.45)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      CONSTELLATION.forEach((star, index) => (index ? ctx.lineTo(star.x, star.y) : ctx.moveTo(star.x, star.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      CONSTELLATION.forEach((star, index) => {
        const book = BOOKS[star.book];
        const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 3 + index) * 0.12;
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.r * 5 * pulse);
        glow.addColorStop(0, book.hex);
        glow.addColorStop(0.35, `${book.hex}88`);
        glow.addColorStop(1, `${book.hex}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * 5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(235,240,255,0.85)";
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(book.symbol, star.x, star.y - star.r * 2.4 - 6);
      });
      ctx.restore();

      // 접안렌즈 테두리와 십자선
      ctx.strokeStyle = "rgba(200,170,110,0.9)";
      ctx.lineWidth = Math.max(3, radius * 0.03);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();
      const vignette = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = vignette;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      const dx = offset.current.x - (TARGET.x + 20);
      const dy = offset.current.y - (TARGET.y + 80);
      const distance = Math.hypot(dx, dy);
      if (!foundRef.current && distance < 170) {
        foundRef.current = true;
        onFound();
      }
      if (!foundRef.current) {
        setFocusHint(distance < 450 ? "색이 번지는 빛이 가까워졌다…" : "화면을 끌거나 방향키로 망원경을 움직여 보세요.");
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onFound, reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const step = 60;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = map[event.key];
      if (!delta) return;
      event.preventDefault();
      move(delta[0], delta[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, onClose]);

  const autoFocus = () => {
    target.current = { x: TARGET.x + 20, y: TARGET.y + 80 };
  };

  return (
    <div className="escape-overlay escape-telescope" role="dialog" aria-modal="true" aria-label="망원경 시야">
      <canvas
        ref={canvasRef}
        className="escape-telescope__canvas"
        aria-hidden="true"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const scale = 330 / (Math.min(rect.width, rect.height) * 0.46);
          move(-(event.clientX - drag.current.x) * scale, -(event.clientY - drag.current.y) * scale);
          drag.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      <div className="escape-telescope__bar">
        <p aria-live="polite">
          {found ? (
            <>
              다섯 색의 별이 한 줄기 선으로 이어져 있다. 가장 밝게 빛나는 건 파란 별(◆)이다.
              <span className="escape-sr-only">
                {" "}선을 따라가면 파랑(◆) → 빨강(●) → 보라(★) → 금색(▲) → 초록(■) 순서다.
              </span>
            </>
          ) : (
            focusHint
          )}
        </p>
        <div>
          <button type="button" className="escape-btn escape-btn--ghost" onClick={autoFocus}>
            자동 초점
          </button>
          <button type="button" className="escape-btn" onClick={onClose} autoFocus>
            망원경에서 눈 떼기
          </button>
        </div>
      </div>
    </div>
  );
}
