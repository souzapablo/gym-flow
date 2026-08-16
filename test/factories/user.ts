import type { User } from "@/lib/user";

type PersistedUserFixture = User & {
  email: string;
  emailNormalized: string;
  emailVerified: boolean;
};

export function buildUserFixture(
  overrides: Partial<PersistedUserFixture> = {},
): PersistedUserFixture {
  const id = overrides.id ?? "70000000-0000-7000-8000-000000000001";
  const email = `${id}@gym-flow.test`;

  return {
    id,
    name: "Local user",
    email,
    emailNormalized: email,
    emailVerified: true,
    ...overrides,
  };
}
