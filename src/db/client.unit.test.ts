import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDatabaseContext, database } from "./client";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
    return;
  }

  process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("production database configuration", () => {
  it("rejects a missing DATABASE_URL", () => {
    delete process.env.DATABASE_URL;

    expect(() => database()).toThrowError("DATABASE_URL is not set");
  });

  it("rejects a Neon URL that does not use its pooled endpoint", () => {
    process.env.DATABASE_URL =
      "postgresql://user:secret@ep-example.us-east-2.aws.neon.tech/gym_flow";

    expect(() => database()).toThrowError(/Neon.*-pooler/);
  });
});

describe("explicit database composition", () => {
  it("creates a bounded client for a Testcontainer URI", async () => {
    const connectionUri =
      "postgresql://test:test@localhost:5432/gym_flow_test";
    const context = createDatabaseContext(connectionUri);

    expect(context.pool.options.connectionString).toBe(connectionUri);
    expect(context.pool.options.max).toBe(5);
    expect(context.database).toBeDefined();

    await context.close();
  });
});
