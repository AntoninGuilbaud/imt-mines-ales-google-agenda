import type { CacheRecord } from "./types";

const memory = new Map<string, CacheRecord>();

export async function readCache(env: { CALENDAR_CACHE?: KVNamespace }, key: string): Promise<CacheRecord | undefined> {
  if (env.CALENDAR_CACHE) return (await env.CALENDAR_CACHE.get<CacheRecord>(key, "json")) ?? undefined;
  return memory.get(key);
}

export async function writeCache(env: { CALENDAR_CACHE?: KVNamespace }, key: string, record: CacheRecord): Promise<void> {
  if (env.CALENDAR_CACHE) {
    await env.CALENDAR_CACHE.put(key, JSON.stringify(record));
    return;
  }
  memory.set(key, record);
}
