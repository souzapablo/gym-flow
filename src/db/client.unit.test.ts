import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { database } from "./client";

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

  it("rejects a Testcontainer-style URL at the production boundary", () => {
    process.env.DATABASE_URL =
      "postgresql://test:test@localhost:5432/gym_flow_test";

    expect(() => database()).toThrowError(/Neon.*-pooler/);
  });
});
