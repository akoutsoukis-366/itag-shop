type Bucket = {
tokens: number;
lastRefill: number; // ms timestamp
};

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
capacity: number; // max tokens in bucket
refillTokens: number; // tokens added per interval
refillIntervalMs: number;// interval length in ms
};

export type RateLimitResult = {
allowed: boolean;
remaining: number;
limit: number;
reset: number; // epoch seconds when a token will be available
};

function nowMs() {
return Date.now();
}

export function rateLimitTry(key: string, cfg: RateLimitConfig): RateLimitResult {
const t = nowMs();
const b = buckets.get(key) ?? { tokens: cfg.capacity, lastRefill: t };

// Refill tokens based on elapsed time
const elapsed = t - b.lastRefill;
if (elapsed >= cfg.refillIntervalMs) {
const intervals = Math.floor(elapsed / cfg.refillIntervalMs);
const add = intervals * cfg.refillTokens;
b.tokens = Math.min(cfg.capacity, b.tokens + add);
b.lastRefill += intervals * cfg.refillIntervalMs;
}

const allowed = b.tokens > 0;
if (allowed) {
b.tokens -= 1;
}

// Next time at least 1 token will be available
const nextRefillMs = b.tokens > 0 ? 0 : b.lastRefill + cfg.refillIntervalMs - t;
const resetEpochSec = Math.floor((t + Math.max(0, nextRefillMs)) / 1000);

buckets.set(key, b);

return {
allowed,
remaining: Math.max(0, b.tokens),
limit: cfg.capacity,
reset: resetEpochSec,
};
}

// Helpers to build a stable client key
export function ipKey(ip: string | null | undefined) {
return "ip:" + (ip ?? "unknown");
}

export function pathKey(path: string) {
return "path:" + path;
}

export function compositeKey(parts: string[]) {
return parts.join("|");
}