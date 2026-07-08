import { appendLog } from "./log-file";

type LogLevel = "INFO" | "WARN" | "ERROR";

function formatLog(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  info(message: string, data?: Record<string, unknown>) {
    console.log(formatLog("INFO", message, data));
    appendLog("INFO", message, data);
  },
  warn(message: string, data?: Record<string, unknown>) {
    console.warn(formatLog("WARN", message, data));
    appendLog("WARN", message, data);
  },
  error(message: string, data?: Record<string, unknown>) {
    console.error(formatLog("ERROR", message, data));
    appendLog("ERROR", message, data);
  },
};
