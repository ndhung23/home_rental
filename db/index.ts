import { Pool } from "pg";

const globalForDb = globalThis as unknown as { homeManagerPool?: Pool };

export const db =
  globalForDb.homeManagerPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.homeManagerPool = db;
