import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { serverConfig } from "./runtime-config";

function getLogConfig() {
  return {
    dir: serverConfig.logDir,
    prefix: serverConfig.logFilePrefix,
    retentionDays: parseInt(serverConfig.logRetentionDays, 10),
  };
}

let currentDate = "";
let logFilePath = "";
let lastCleanupDate = "";

function getDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureLogFile(): void {
  const today = getDateString();
  if (today !== currentDate) {
    currentDate = today;
    const { dir, prefix } = getLogConfig();
    logFilePath = resolve(join(dir, `${prefix}-${today}.jsonl`));

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

function cleanupOldFiles(): void {
  const today = getDateString();
  if (today === lastCleanupDate) return;
  lastCleanupDate = today;

  const { dir, prefix, retentionDays } = getLogConfig();

  if (!existsSync(dir)) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.startsWith(prefix) || !file.endsWith(".jsonl")) continue;
      const fullPath = join(dir, file);
      const stats = statSync(fullPath);
      if (stats.mtimeMs < cutoff) {
        unlinkSync(fullPath);
      }
    }
  } catch {
    // silently ignore cleanup errors
  }
}

export function appendLog(level: string, message: string, data?: Record<string, unknown>): void {
  ensureLogFile();

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (data) {
    entry.data = data;
  }

  try {
    appendFileSync(logFilePath, JSON.stringify(entry) + "\n");
  } catch {
    // silently ignore write errors
  }

  cleanupOldFiles();
}
