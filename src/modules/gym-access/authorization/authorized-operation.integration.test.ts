import { afterAll, beforeEach, expect, inject, it } from "vitest";
import { sql } from "drizzle-orm";
import { users } from "@/db/schema";
import { createTestDatabase } from "../../../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../../../test/database/reset";
import { createGymProvisioningService } from "../gym/provision-gym";
import { createActiveGymService } from "../active-gym/active-gym";
import { createAuthorizedOperationBoundary } from "./authorized-operation";
import { AuthorizationAuditError } from "./denial-audit";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "authorized-operation-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);
const userId = "70000000-0000-7000-8000-000000000061";
let gymId: string;
beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
  await context.database
    .insert(users)
    .values({
      id: userId,
      name: "User",
      email: "user@example.com",
      emailVerified: true,
    });
  const gym = await createGymProvisioningService({ db: context.database })(
    { userId, email: "user@example.com" },
    { name: "Gym" },
  );
  gymId = gym.id;
  await createActiveGymService(context.database).resolveActiveGym(userId);
});
afterAll(async () => context.close());

it("executes an allowed handler with the same transaction and invocation context", async () => {
  const result = await boundary()({
    ...request(),
    handler: async (transaction, authorized) => {
      await transaction.execute(sql`select 1`);
      return authorized;
    },
  });
  expect(result).toMatchObject({
    actorUserId: userId,
    gymId,
    role: "owner",
    operation: "manage_training_resources",
  });
});

it("resolves the actual resource gym before denying cross-gym access", async () => {
  await expect(
    boundary()({
      ...request(),
      resolveResourceFacts: async () => ({
        gymId: "72000000-0000-7000-8000-000000000099",
      }),
    }),
  ).rejects.toMatchObject({
    name: "GymAccessForbiddenError",
    message: "Gym access is forbidden",
  });
  expect(await denialCount()).toBe("1");
});

it.each([
  ["trainee", "role"],
  ["coach", "relationship"],
] as const)("denies %s protected work for %s policy", async (role, reason) => {
  await setRole(role);
  const deniedRequest =
    role === "coach"
      ? {
          ...request(),
          operation: "access_trainee_resources" as const,
          resource: { type: "trainee_resource" as const, gymId },
        }
      : request();
  await expect(boundary()(deniedRequest)).rejects.toMatchObject({
    name: "GymAccessForbiddenError",
    message: "Gym access is forbidden",
  });
  const result = await context.pool.query(
    "select metadata->>'reason' as reason from security_audit_events where event_type = 'authorization.denied'",
  );
  expect(result.rows[0].reason).toBe(reason);
});

it("denies stale current context without executing protected work", async () => {
  await context.pool.query("delete from active_gym_selections");
  let executed = false;
  await expect(
    boundary()({
      ...request(),
      handler: async () => {
        executed = true;
        return "no";
      },
    }),
  ).rejects.toMatchObject({ name: "GymAccessForbiddenError" });
  expect(executed).toBe(false);
});

it("throws AuthorizationAuditError and never executes protected work when audit fails", async () => {
  await setRole("trainee");
  let executed = false;
  const authorize = createAuthorizedOperationBoundary({
    db: context.database,
    auditDenial: async () => {
      throw new AuthorizationAuditError();
    },
  });
  await expect(
    authorize({
      ...request(),
      handler: async () => {
        executed = true;
        return "no";
      },
    }),
  ).rejects.toBeInstanceOf(AuthorizationAuditError);
  expect(executed).toBe(false);
});

it("rolls back handler failure without a denial audit", async () => {
  await expect(
    boundary()({
      ...request(),
      handler: async (transaction) => {
        await transaction.execute(
          sql`insert into users (name, email, email_normalized, email_verified) values ('Temp', 'temp@example.com', 'temp@example.com', true)`,
        );
        throw new Error("handler failed");
      },
    }),
  ).rejects.toThrow("handler failed");
  const result = await context.pool.query(
    "select count(*) from users where email = 'temp@example.com'",
  );
  expect(result.rows[0].count).toBe("0");
  expect(await denialCount()).toBe("0");
});

it("denies inactive current membership generically and audits status", async () => {
  await setRole("trainee");
  await context.pool.query(
    "update memberships set status = 'suspended' where user_id = $1",
    [userId],
  );
  await expect(boundary()(request())).rejects.toMatchObject({
    name: "GymAccessForbiddenError",
    message: "Gym access is forbidden",
  });
  expect(await denialCount()).toBe("1");
});

function boundary() {
  return createAuthorizedOperationBoundary({ db: context.database });
}
function request() {
  return {
    actorUserId: userId,
    operation: "manage_training_resources" as const,
    resource: { type: "training_resource" as const, gymId },
    handler: async () => "ok",
  };
}
async function setRole(role: "coach" | "trainee") {
  await context.pool.query(
    "alter table memberships disable trigger memberships_protect_owner_before_write",
  );
  await context.pool.query(
    "update memberships set role = $1 where user_id = $2",
    [role, userId],
  );
  await context.pool.query(
    "alter table memberships enable trigger memberships_protect_owner_before_write",
  );
}
async function denialCount() {
  return (
    await context.pool.query(
      "select count(*) from security_audit_events where event_type = 'authorization.denied'",
    )
  ).rows[0].count;
}
