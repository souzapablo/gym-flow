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

export type { GymContextDto, MembershipDto };

export const gymAccess = Object.freeze({
  provisionGym,
  listMemberships,
  resolveActiveGym,
  selectActiveGym,
});
