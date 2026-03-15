import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { prepare: false });

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
} from "drizzle-orm";
