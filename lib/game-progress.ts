export type GameTheme = "wood" | "forest" | "neon" | "berry" | "royal" | "ink";

export type GameProgressMeta = {
  slug: string;
  title: string;
  href: string;
  theme: GameTheme;
  symbol: string;
  summary: string;
  updatedAt: number;
};

export type StoredGameProgress<T> = {
  version: 1;
  meta: GameProgressMeta;
  state: T;
};

type SaveGameProgressInput<T> = Omit<GameProgressMeta, "href" | "updatedAt"> & {
  href?: string;
  state: T;
};

const VERSION = 1 as const;
const STORAGE_PREFIX = "ddanjitmoa:progress:";
const INDEX_KEY = "ddanjitmoa:progress:index";
export const GAME_PROGRESS_EVENT = "ddanjitmoa:progress-changed";

const isBrowser = () => typeof window !== "undefined";
const progressKey = (slug: string) => `${STORAGE_PREFIX}${slug}`;

function isProgressMeta(value: unknown): value is GameProgressMeta {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<GameProgressMeta>;
  return (
    typeof meta.slug === "string" &&
    typeof meta.title === "string" &&
    typeof meta.href === "string" &&
    typeof meta.theme === "string" &&
    typeof meta.symbol === "string" &&
    typeof meta.summary === "string" &&
    typeof meta.updatedAt === "number" &&
    Number.isFinite(meta.updatedAt)
  );
}

function readIndex(): GameProgressMeta[] {
  if (!isBrowser()) return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(INDEX_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProgressMeta).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeIndex(items: GameProgressMeta[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    INDEX_KEY,
    JSON.stringify(items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8)),
  );
}

function notifyProgressChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(GAME_PROGRESS_EVENT));
}

export function listGameProgress(limit = 3): GameProgressMeta[] {
  return readIndex().slice(0, Math.max(0, limit));
}

export function loadGameProgress<T>(slug: string): StoredGameProgress<T> | null {
  if (!isBrowser()) return null;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(progressKey(slug)) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<StoredGameProgress<T>>;
    if (record.version !== VERSION || !isProgressMeta(record.meta) || !("state" in record)) {
      clearGameProgress(slug);
      return null;
    }
    return record as StoredGameProgress<T>;
  } catch {
    clearGameProgress(slug);
    return null;
  }
}

export function saveGameProgress<T>({
  slug,
  title,
  href = `/games/${slug}`,
  theme,
  symbol,
  summary,
  state,
}: SaveGameProgressInput<T>) {
  if (!isBrowser()) return false;

  const meta: GameProgressMeta = {
    slug,
    title,
    href,
    theme,
    symbol,
    summary,
    updatedAt: Date.now(),
  };
  const record: StoredGameProgress<T> = { version: VERSION, meta, state };

  try {
    window.localStorage.setItem(progressKey(slug), JSON.stringify(record));
    const nextIndex = [meta, ...readIndex().filter((item) => item.slug !== slug)];
    writeIndex(nextIndex);
    notifyProgressChanged();
    return true;
  } catch {
    return false;
  }
}

export function clearGameProgress(slug: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(progressKey(slug));
    writeIndex(readIndex().filter((item) => item.slug !== slug));
    notifyProgressChanged();
  } catch {
    // 저장 공간 접근이 제한된 환경에서도 게임 자체는 계속 실행합니다.
  }
}
