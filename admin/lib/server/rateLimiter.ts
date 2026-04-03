interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Prune expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count++;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}
