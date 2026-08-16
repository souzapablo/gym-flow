import type { User } from "@/lib/user";

type PersistedUserFixture = User & {
  email: string;
  emailNormalized: string;
  emailVerified: boolean;
};

export function buildUserFixture(
  overrides: Partial<PersistedUserFixture> = {},
): PersistedUserFixture {
  const id = overrides.id ?? "local-user";
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
