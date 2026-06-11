/** Minimal structured-ish console logger. Swap for pino/winston later. */
type Level = "info" | "warn" | "error" | "debug";

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const suffix = meta ? " " + JSON.stringify(meta) : "";
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](
    `[${ts}] ${level.toUpperCase()} ${msg}${suffix}`,
  );
}

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    emit("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) =>
    emit("debug", msg, meta),
};
