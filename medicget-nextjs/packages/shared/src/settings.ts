/**
 * AppSettings runtime — single source of truth for settings the superadmin
 * can edit at runtime (SMTP, PayPhone, Jitsi, branding, platform fee).
 *
 * Resolution order for any key:
 *   1. AppSettings row in Postgres (if present and non-empty)
 *   2. Falls back to `process.env[KEY]`
 *   3. Falls back to a hard-coded sensible default (caller can supply one)
 *
 * The values are cached in-process for 30 seconds. The superadmin's
 * "save" endpoint should call `invalidateSettingsCache()` after writing
 * so changes take effect within seconds, not minutes.
 *
 * Read once at startup of long-lived loops or workers; for per-request
 * code, just call `getSetting()` — the cache makes it cheap.
 */

const CACHE_TTL_MS = 30 * 1000;

let cache: Map<string, string | null> | null = null;
let cacheLoadedAt = 0;
let inflight: Promise<void> | null = null;

async function loadCache(): Promise<void> {
  // Avoid stampedes — only one DB call at a time even if many handlers
  // miss the cache simultaneously.
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { prisma } = await import('./prisma');
      const rows = await prisma.appSettings.findMany({
        select: { key: true, value: true },
      });
      const next = new Map<string, string | null>();
      for (const r of rows) next.set(r.key, r.value ?? null);
      cache = next;
      cacheLoadedAt = Date.now();
    } catch {
      // If the table doesn't exist yet (pre-migration) just keep the
      // cache empty — callers will fall back to env vars.
      cache = new Map();
      cacheLoadedAt = Date.now();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

async function ensureCache(): Promise<Map<string, string | null>> {
  if (!cache || (Date.now() - cacheLoadedAt) > CACHE_TTL_MS) {
    await loadCache();
  }
  return cache!;
}

/**
 * Returns the runtime value of a setting, falling back through DB →
 * env var → supplied default.
 */
export async function getSetting(
  key: string,
  fallback?: string,
): Promise<string | undefined> {
  const c = await ensureCache();
  const v = c.get(key);
  if (v !== undefined && v !== null && v !== '') return v;
  const envV = process.env[key];
  if (envV && envV !== '') return envV;
  return fallback;
}

/**
 * Boolean variant — interprets common truthy strings.
 */
export async function getSettingBool(key: string, fallback = false): Promise<boolean> {
  const v = await getSetting(key);
  if (v === undefined) return fallback;
  return /^(true|1|yes|on)$/i.test(v);
}

/**
 * Number variant — falls back to `fallback` if missing or unparseable.
 */
export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const v = await getSetting(key);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Drop the in-process cache. Call this from the admin save endpoint
 * (svc-admin) after writing new settings. The next read will repopulate
 * from DB.
 */
export function invalidateSettingsCache(): void {
  cache = null;
  cacheLoadedAt = 0;
}
