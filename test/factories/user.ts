import type { User } from "@/lib/user";

export function buildUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: "local-user",
    name: "Local user",
    ...overrides,
  };
}
