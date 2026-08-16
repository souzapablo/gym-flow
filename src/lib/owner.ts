import "server-only";

import { findUserById } from "@/data/users";

// Replace this function with the selected authentication provider. Keeping the
// owner lookup behind one server-only boundary prevents ownership rules from
// leaking into pages, actions, and queries.
export async function getCurrentUser() {
  const user = await findUserById("70000000-0000-7000-8000-000000000001");

  if (!user) {
    throw new Error("Current user not found. Run migrations/002_users.sql.");
  }

  return user;
}
