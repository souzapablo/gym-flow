import { afterAll, beforeAll, beforeEach, expect, inject, it } from "vitest";

import { users } from "@/db/schema";
import { buildUserFixture } from "../../test/factories/user";
import {
  closeTestDatabase,
  createTestDatabase,
} from "../../test/database/client";
import {
  resetTestDatabase,
  type TestDatabaseProof,
} from "../../test/database/reset";

import { findUserById } from "./users";

const databaseUri = inject("databaseUri");
const proof: TestDatabaseProof = {
  databaseName: "gym_flow_test",
  suiteId: "users-integration-suite",
  connectionUri: databaseUri,
};
const context = createTestDatabase(databaseUri);

beforeAll(async () => {
  await context.pool.query("select 1");
});

beforeEach(async () => {
  await resetTestDatabase(context.pool, proof);
});

afterAll(async () => {
  await closeTestDatabase();
  await context.close();
});

it("returns the mapped user when the id exists", async () => {
  const user = buildUserFixture({
    id: "70000000-0000-7000-8000-000000000021",
    name: "Pablo",
  });
  await context.database.insert(users).values(user);

  await expect(findUserById(user.id)).resolves.toEqual({
    id: "70000000-0000-7000-8000-000000000021",
    name: "Pablo",
  });
});

it("returns null when the user id does not exist", async () => {
  await expect(
    findUserById("70000000-0000-7000-8000-000000000099"),
  ).resolves.toBeNull();
});
