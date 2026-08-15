import "server-only";

// Replace this function with the selected authentication provider. Keeping the
// owner lookup behind one server-only boundary prevents ownership rules from
// leaking into pages, actions, and queries.
export function getCurrentOwnerId() {
  return "local-user";
}
