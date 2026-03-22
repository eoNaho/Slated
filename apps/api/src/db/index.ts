import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  prepare: false,
  max: 20,          // max connections in pool
  idle_timeout: 30, // close idle connections after 30s
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Re-export schema and drizzle utilities
export * from "./schema";
export {
  eq,
  and,
  or,
  desc,
  asc,
  sql,
  like,
  ilike,
  count,
  isNull,
  inArray,
  gte,
  lte,
  gt,
  lt,
  ne,
  notInArray,
  isNotNull,
} from "drizzle-orm";
