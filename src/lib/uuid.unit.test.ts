import { describe, expect, it } from "vitest";

import { createUuidV7, isUuidV7 } from "./uuid";

describe("isUuidV7", () => {
  it("accepts an RFC 9562 UUIDv7", () => {
    expect(isUuidV7("0198b8de-1981-7cdb-908f-f1419f97c49f")).toBe(true);
  });

  it.each(["0198b8de-1981-4cdb-908f-f1419f97c49f", "not-a-uuid", ""])(
    "rejects a non-UUIDv7 identifier",
    (value) => {
      expect(isUuidV7(value)).toBe(false);
    },
  );
});

describe("createUuidV7", () => {
  it("creates an RFC 9562 UUIDv7 containing the supplied Unix timestamp", () => {
    const timestamp = 1_787_000_000_123;
    const id = createUuidV7(timestamp);

    expect(isUuidV7(id)).toBe(true);
    expect(Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16)).toBe(
      timestamp,
    );
  });
});
