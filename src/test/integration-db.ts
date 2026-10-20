import { pool } from "@/db";

export async function closeDatabase(): Promise<void> {
  const globalForDb = globalThis as unknown as { pool?: unknown };
  await pool.end();
  globalForDb.pool = undefined;
}
