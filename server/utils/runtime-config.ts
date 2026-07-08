process.loadEnvFile?.();

export const serverConfig = {
  trongridApiKey: process.env.TRONGRID_API_KEY || "",
  dbPath: process.env.DB_PATH || "./data/tron-mpc.db",
  mpcNatsUrl: process.env.MPC_NATS_URL || "nats://127.0.0.1:4222",
  mpcKeyPath: process.env.MPC_KEY_PATH || "./event_initiator.key",
  mpcSignTimeoutMs: process.env.MPC_SIGN_TIMEOUT_MS || "60000",
  logDir: process.env.LOG_DIR || "./logs",
  logFilePrefix: process.env.LOG_FILE_PREFIX || "app",
  logRetentionDays: process.env.LOG_RETENTION_DAYS || "30",
};
