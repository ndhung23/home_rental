import { Pool } from "pg";

const globalForDb = globalThis as unknown as { homeManagerPool?: Pool };

export const db =
  globalForDb.homeManagerPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase session pooler giới hạn thấp ở gói Free. Hai kết nối là đủ
    // cho dashboard và tránh giữ hết slot khi Next.js hot reload.
    max: 2,
    min: 0,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.homeManagerPool = db;
