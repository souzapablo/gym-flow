import "server-only";

import { headers } from "next/headers";

import { gymFlowAuth } from "./auth";

export type AuthenticatedIdentity = Readonly<{
  userId: string;
  email: string;
}>;

type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export type SessionReader = () => Promise<SessionUser | null>;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class VerifiedEmailRequiredError extends Error {
  constructor() {
    super("A verified email is required");
    this.name = "VerifiedEmailRequiredError";
  }
}

export function createIdentityBoundary(readSessionUser: SessionReader) {
  return {
    async getAuthenticatedIdentity(): Promise<AuthenticatedIdentity | null> {
      const user = await readSessionUser();

      if (!user) {
        return null;
      }

      if (!user.emailVerified) {
        throw new VerifiedEmailRequiredError();
      }

      return {
        userId: user.id,
        email: normalizeEmail(user.email),
      };
    },

    async requireVerifiedIdentity(): Promise<AuthenticatedIdentity> {
      const identity = await this.getAuthenticatedIdentity();

      if (!identity) {
        throw new AuthenticationRequiredError();
      }

      return identity;
    },
  };
}

const identityBoundary = createIdentityBoundary(async () => {
  const session = await gymFlowAuth().api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
});

export const getAuthenticatedIdentity =
  identityBoundary.getAuthenticatedIdentity.bind(identityBoundary);
export const requireVerifiedIdentity =
  identityBoundary.requireVerifiedIdentity.bind(identityBoundary);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
