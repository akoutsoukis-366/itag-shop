export type LogLevel = "info" | "warn" | "error";

function toEntry(level: LogLevel, message: string, meta?: Record<string, unknown>) {
return {
level,
message,
time: new Date().toISOString(),
...(meta ?? {}),
};
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
const entry = toEntry(level, message, meta);
const line = JSON.stringify(entry);
if (level === "error") console.error(line);
else if (level === "warn") console.warn(line);
else console.log(line);
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
log("info", message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
log("warn", message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>) {
log("error", message, meta);
}