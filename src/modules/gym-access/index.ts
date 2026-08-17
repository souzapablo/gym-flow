import { provisionGym } from "./gym";
import {
  resolveActiveGym,
  selectActiveGym,
  type GymContextDto,
} from "./active-gym/active-gym-dto";
import {
  listMemberships,
  type MembershipDto,
} from "./membership/list-memberships";
import {
  authorizeGymOperation,
  type AuthorizedGymContextDto,
  type GymAuthorizationRequestDto,
} from "./authorization/authorization-facade";

export type {
  AuthorizedGymContextDto,
  GymAuthorizationRequestDto,
  GymContextDto,
  MembershipDto,
};

export const gymAccess = Object.freeze({
  provisionGym,
  listMemberships,
  resolveActiveGym,
  selectActiveGym,
  authorizeGymOperation,
});
