import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Minimal structured logger: every call emits one JSON line with a
 * level, a message, a timestamp, and whatever context the caller
 * passes — no string interpolation, no free-form console.log calls to
 * grep through. This is deliberately small rather than a full pino/
 * winston setup: the property that actually matters for "structured
 * logging" — every log line is a parseable JSON object with consistent
 * fields — doesn't require a dependency to get right, and a thin
 * wrapper here keeps the door open to swap in pino later (same call
 * sites, different implementation) without it being a rewrite.
 */
function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const serialized = JSON.stringify(line);

  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
