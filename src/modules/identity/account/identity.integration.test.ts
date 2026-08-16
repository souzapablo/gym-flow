import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";

import {
  AuthenticationRequiredError,
  createIdentityBoundary,
  VerifiedEmailRequiredError,
} from "./identity";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "identity-account-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
});

afterAll(async () => {
  await context.close();
});

describe("requireVerifiedIdentity", () => {
  it("returns stable provider-neutral identity for a verified session", async () => {
    const boundary = createIdentityBoundary(async () => ({
      id: "user-1",
      email: "  Pablo@Example.COM ",
      emailVerified: true,
    }));

    await expect(boundary.requireVerifiedIdentity()).resolves.toEqual({
      userId: "user-1",
      email: "pablo@example.com",
    });
  });

  it("rejects a missing session", async () => {
    const boundary = createIdentityBoundary(async () => null);

    await expect(boundary.requireVerifiedIdentity()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
  });

  it("rejects an unverified session", async () => {
    const boundary = createIdentityBoundary(async () => ({
      id: "user-1",
      email: "pablo@example.com",
      emailVerified: false,
    }));

    await expect(boundary.requireVerifiedIdentity()).rejects.toBeInstanceOf(
      VerifiedEmailRequiredError,
    );
  });
});

it("rejects duplicate normalized verified email identities", async () => {
  await context.database.insert(users).values({
    id: "user-1",
    name: "Pablo",
    email: "Pablo@Example.com",
    emailVerified: true,
  });

  await expect(
    context.database.insert(users).values({
      id: "user-2",
      name: "Another Pablo",
      email: " pablo@example.COM ",
      emailVerified: true,
    }),
  ).rejects.toMatchObject({
    cause: {
      code: "23505",
      constraint: "users_email_normalized_idx",
    },
  });
});

it("preserves user id and memberships after a verified email change", async () => {
  await context.database.insert(users).values({
    id: "user-1",
    name: "Pablo",
    email: "before@example.com",
    emailVerified: true,
  });

  await context.pool.query("begin");
  try {
    const gym = await context.pool.query<{ id: string }>(
      "insert into gyms (name, owner_user_id) values ($1, $2) returning id",
      ["Downtown Gym", "user-1"],
    );
    await context.pool.query(
      "insert into memberships (gym_id, user_id, role, status) values ($1, $2, 'owner', 'active')",
      [gym.rows[0].id, "user-1"],
    );
    await context.pool.query("commit");
  } catch (error) {
    await context.pool.query("rollback");
    throw error;
  }

  await context.pool.query(
    "update users set email = $1, email_verified = true where id = $2",
    ["after@example.com", "user-1"],
  );
  const result = await context.pool.query<{
    id: string;
    email_normalized: string;
    membership_user_id: string;
  }>(`
    select users.id, users.email_normalized, memberships.user_id as membership_user_id
    from users
    join memberships on memberships.user_id = users.id
    where users.id = 'user-1'
  `);

  expect(result.rows).toEqual([
    {
      id: "user-1",
      email_normalized: "after@example.com",
      membership_user_id: "user-1",
    },
  ]);
});
