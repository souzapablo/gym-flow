import { neon } from "@neondatabase/serverless";

export function db() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return neon(connectionString);
}
