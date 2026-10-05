// Leaderboard storage for the PAX Aus 2026 booth build.
// On Claude (artifact with the `db` capability) scores live in the shared
// "scores" collection. Anywhere else (local file, preview) it falls back to
// this browser's localStorage so the game still works offline.

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  switches: number;
  distance: number;
  createdAt: string;
};

type NewEntry = Omit<LeaderboardEntry, "id" | "createdAt">;

type DbQuery = {
  where(field: string, op: string, value: unknown): DbQuery;
  orderBy(field: string, dir?: "asc" | "desc"): DbQuery;
  limit(n: number): DbQuery;
  get(): Promise<{ size: number; docs: DbDoc[] }>;
  onSnapshot(
    next: (snap: { docs: DbDoc[] }) => void,
    error?: (e: { code: string; message: string }) => void,
  ): () => void;
};
type DbDoc = { id: string; data(): Record<string, unknown> | undefined };
type Db = {
  collection(path: string): DbQuery & {
    add(data: Record<string, unknown>): Promise<{ id: string }>;
  };
};

const COLLECTION = "scores";
const TOP_N = 10;
const LOCAL_KEY = "keychron-pax-2026-scores";

let dbPromise: Promise<Db | null> | null = null;

function getDb(): Promise<Db | null> {
  if (!dbPromise) {
    const claude = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
    dbPromise = claude?.use
      ? claude.use("db").then((db) => (db as Db | null) ?? null).catch(() => null)
      : Promise.resolve(null);
  }
  return dbPromise;
}

const toEntry = (doc: DbDoc): LeaderboardEntry | null => {
  const data = doc.data();
  if (!data || typeof data.score !== "number") return null;
  return {
    id: doc.id,
    name: String(data.name ?? "").slice(0, 16) || "Player",
    score: data.score,
    switches: Number(data.switches ?? 0),
    distance: Number(data.distance ?? 0),
    createdAt: String(data.createdAt ?? ""),
  };
};

// ---- localStorage fallback ----

const localListeners = new Set<(entries: LeaderboardEntry[]) => void>();

function readLocal(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch {
    // Storage blocked: scores only last for this page load.
  }
}

let memoryEntries: LeaderboardEntry[] | null = null;
const allLocal = () => memoryEntries ?? (memoryEntries = readLocal());
const topLocal = () => [...allLocal()].sort((a, b) => b.score - a.score).slice(0, TOP_N);

// ---- public API ----

export function subscribeLeaderboard(
  onChange: (entries: LeaderboardEntry[]) => void,
  onError: (message: string) => void,
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  void getDb().then((db) => {
    if (cancelled) return;
    if (!db) {
      const listener = (entries: LeaderboardEntry[]) => onChange(entries);
      localListeners.add(listener);
      onChange(topLocal());
      unsubscribe = () => localListeners.delete(listener);
      return;
    }
    unsubscribe = db
      .collection(COLLECTION)
      .orderBy("score", "desc")
      .limit(TOP_N)
      .onSnapshot(
        (snap) => onChange(snap.docs.map(toEntry).filter((e): e is LeaderboardEntry => !!e)),
        () => onError("Leaderboard unavailable right now"),
      );
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function addScore(entry: NewEntry): Promise<string> {
  const body = { ...entry, createdAt: new Date().toISOString() };
  const db = await getDb();
  if (!db) {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next = [...allLocal(), { id, ...body }];
    memoryEntries = next;
    writeLocal(next);
    const top = topLocal();
    localListeners.forEach((listener) => listener(top));
    return id;
  }
  try {
    return (await db.collection(COLLECTION).add(body)).id;
  } catch (error) {
    if ((error as { code?: string })?.code !== "unavailable") throw error;
    await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 400));
    return (await db.collection(COLLECTION).add(body)).id;
  }
}

/**
 * Staff reset for the leaderboard kept in this browser (GitHub Pages / offline).
 * Returns false on Claude, where the shared board lives in the artifact's
 * database and is cleared by the owner instead.
 */
export async function clearLocalScores(): Promise<boolean> {
  if (await getDb()) return false;
  memoryEntries = [];
  writeLocal([]);
  localListeners.forEach((listener) => listener([]));
  return true;
}

/** How many saved scores beat this one (rank = result + 1). */
export async function countScoresAbove(score: number): Promise<number> {
  const db = await getDb();
  if (!db) return allLocal().filter((entry) => entry.score > score).length;
  const snap = await db.collection(COLLECTION).where("score", ">", score).limit(1000).get();
  return snap.size;
}
