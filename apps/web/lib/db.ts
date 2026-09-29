import "server-only";
import postgres from "postgres";

/**
 * Direct Postgres connection for server-only operations that must bypass RLS or read columns
 * the API roles can't see (Google refresh tokens). Everything user-facing goes through Supabase.
 */
const g = globalThis as unknown as { __sql?: postgres.Sql };
export const sql = (g.__sql ??= postgres(process.env.DATABASE_URL!, { max: 3, prepare: false }));
