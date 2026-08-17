import { afterAll, beforeEach, expect, inject, it } from "vitest";
import { users } from "@/db/schema";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";
import { createGymProvisioningService } from "../gym/provision-gym";
import { createActiveGymService } from "../active-gym/active-gym";
import { loadCurrentAuthorizationFacts } from "./facts-loader";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "authorization-facts-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const userId = "70000000-0000-7000-8000-000000000041";

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
  await context.database.insert(users).values({
    id: userId,
    name: "User",
    email: "user@example.com",
    emailVerified: true,
  });
});
afterAll(async () => context.close());

it("loads current active authorization facts", async () => {
  const gym = await selectedGym();
  const result = await context.database.transaction((tx) =>
    loadCurrentAuthorizationFacts(tx, userId),
  );
  expect(result).toEqual({
    actorUserId: userId,
    activeGymId: gym.id,
    membershipId: gym.ownerMembership.id,
    membershipGymId: gym.id,
    role: "owner",
    status: "active",
  });
});

it("denies an absent selection", async () => {
  expect(
    await context.database.transaction((tx) =>
      loadCurrentAuthorizationFacts(tx, userId),
    ),
  ).toEqual({ actorUserId: userId, denyReason: "missing_fact" });
});

it.each(["suspended", "removed"])(
  "denies a %s selected membership",
  async (status) => {
    const membershipId = await selectedTrainee();
    await context.pool.query(
      "update memberships set status = $1 where id = $2",
      [status, membershipId],
    );
    const result = await context.database.transaction((tx) =>
      loadCurrentAuthorizationFacts(tx, userId),
    );
    expect(result.denyReason).toBe("membership_status");
  },
);

it.each([
  ["role", "unknown", "unknown_role"],
  ["status", "unknown", "unknown_status"],
] as const)("denies malformed %s", async (column, value, reason) => {
  const gym = column === "status" ? undefined : await selectedGym();
  const membershipId =
    column === "status" ? await selectedTrainee() : gym!.ownerMembership.id;
  await context.pool.query(
    "alter table memberships disable trigger memberships_protect_owner_before_write",
  );
  await context.pool.query(
    `alter table memberships drop constraint memberships_${column}_check`,
  );
  await context.pool.query(
    `update memberships set ${column} = $1 where id = $2`,
    [value, membershipId],
  );
  const result = await context.database.transaction((tx) =>
    loadCurrentAuthorizationFacts(tx, userId),
  );
  await context.pool.query(
    `update memberships set ${column} = $1 where id = $2`,
    [column === "role" ? "owner" : "active", membershipId],
  );
  await context.pool.query(
    `alter table memberships add constraint memberships_${column}_check check (${column} in (${column === "role" ? "'owner', 'admin', 'coach', 'trainee'" : "'active', 'suspended', 'removed'"}))`,
  );
  await context.pool.query(
    "alter table memberships enable trigger memberships_protect_owner_before_write",
  );
  expect(result.denyReason).toBe(reason);
});

it("denies a stale selection", async () => {
  await selectedGym();
  await context.pool.query(
    "alter table active_gym_selections drop constraint active_gym_selections_gym_id_membership_id_fkey",
  );
  await context.pool.query(
    "update active_gym_selections set membership_id = '71000000-0000-7000-8000-000000000099'",
  );
  const result = await context.database.transaction((tx) =>
    loadCurrentAuthorizationFacts(tx, userId),
  );
  await context.pool.query("delete from active_gym_selections");
  await context.pool.query(
    "alter table active_gym_selections add constraint active_gym_selections_gym_id_membership_id_fkey foreign key (gym_id, membership_id) references memberships(gym_id, id) on delete cascade",
  );
  expect(result.denyReason).toBe("missing_fact");
});

it("holds a shared membership lock until its transaction finishes", async () => {
  const gym = await selectedGym();
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loading = context.database.transaction(async (tx) => {
    await loadCurrentAuthorizationFacts(tx, userId);
    await hold;
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const client = await context.pool.connect();
  await client.query("begin");
  await client.query("set local statement_timeout = 100");
  await expect(
    client.query("update memberships set updated_at = now() where id = $1", [
      gym.ownerMembership.id,
    ]),
  ).rejects.toMatchObject({ code: "57014" });
  await client.query("rollback");
  client.release();
  release();
  await loading;
});

async function selectedGym() {
  const gym = await createGymProvisioningService({ db: context.database })(
    { userId, email: "user@example.com" },
    { name: "Gym" },
  );
  await createActiveGymService(context.database).resolveActiveGym(userId);
  return gym;
}

async function selectedTrainee() {
  const ownerId = "70000000-0000-7000-8000-000000000042";
  await context.database.insert(users).values({
    id: ownerId,
    name: "Owner",
    email: "owner@example.com",
    emailVerified: true,
  });
  const gym = await createGymProvisioningService({ db: context.database })(
    { userId: ownerId, email: "owner@example.com" },
    { name: "Gym" },
  );
  const result = await context.pool.query<{ id: string }>(
    "insert into memberships (gym_id, user_id, role, status) values ($1, $2, 'trainee', 'active') returning id",
    [gym.id, userId],
  );
  await context.pool.query(
    "insert into active_gym_selections (user_id, gym_id, membership_id) values ($1, $2, $3)",
    [userId, gym.id, result.rows[0].id],
  );
  return result.rows[0].id;
}
