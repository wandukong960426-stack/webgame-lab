export type GameEvent =
  | "game_start"
  | "game_restart"
  | "game_end"
  | "game_mode_change"
  | "game_fullscreen"
  | "game_resume";

type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, params?: Record<string, unknown>) => void;
  dataLayer?: Array<Record<string, unknown>>;
};

export function trackGameEvent(
  event: GameEvent,
  game: string,
  params: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  const payload = { game, ...params };
  const target = window as GtagWindow;
  target.gtag?.("event", event, payload);
  target.dataLayer?.push({ event, ...payload });
  window.dispatchEvent(
    new CustomEvent("ddanjitmoa:game", {
      detail: { event, ...payload },
    }),
  );
}
