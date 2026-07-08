import { createClient } from "@libsql/client/sqlite3";
import { v7 as uuidv7 } from "uuid";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "../utils/logger";
import { serverConfig } from "../utils/runtime-config";

function getDbPath(): string {
  return serverConfig.dbPath;
}

let db: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb() {
  const dbPath = getDbPath();
  logger.info("初始化数据库", { path: dbPath });

  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logger.info("创建数据库目录", { dir });
  }

  db = createClient({
    url: `file:${dbPath}`,
  });

  db.execute(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  logger.info("数据库初始化完成");
  return db;
}

function mapRow(row: any) {
  return {
    id: row.id,
    ...JSON.parse(row.data as string),
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  };
}

export async function create<T>(table: string, data: T) {
  const db = getDb();
  const id = uuidv7();
  const now = Date.now();
  const json = JSON.stringify(data);

  logger.info(`创建记录 [${table}]`, { id });

  await db.execute({
    sql: `INSERT INTO ${table} (id, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
    args: [id, json, now, now],
  });

  return { id, ...data, createdAt: now, updatedAt: now };
}

export async function findById(table: string, id: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM ${table} WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as any;
  return {
    id: row.id,
    ...JSON.parse(row.data as string),
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  };
}

export async function findAll(table: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM ${table} ORDER BY createdAt DESC`,
    args: [],
  });

  return result.rows.map(mapRow);
}

export async function updateField(table: string, id: string, field: string, value: unknown) {
  const db = getDb();
  const now = Date.now();

  const result = await db.execute({
    sql: `UPDATE ${table} SET data = json_set(data, ?, ?), updatedAt = ? WHERE id = ?`,
    args: [`$.${field}`, value, now, id] as any,
  });

  return result.rowsAffected > 0;
}

export async function findByField(table: string, field: string, value: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM ${table} WHERE json_extract(data, ?) = ? ORDER BY createdAt DESC`,
    args: [`$.${field}`, value],
  });

  return result.rows.map(mapRow);
}
