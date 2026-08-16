import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";

import { database } from "@/db/client";
import * as schema from "@/db/schema";

let configuredAuth: ReturnType<typeof createGymFlowAuth> | undefined;

export function createGymFlowAuth(
  db: ReturnType<typeof database> = database(),
) {
  return betterAuth({
    advanced: {
      database: {
        generateId: false,
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    user: {
      modelName: "users",
      changeEmail: {
        enabled: true,
      },
    },
    session: { modelName: "sessions" },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
  });
}

export function gymFlowAuth() {
  configuredAuth ??= createGymFlowAuth();
  return configuredAuth;
}
