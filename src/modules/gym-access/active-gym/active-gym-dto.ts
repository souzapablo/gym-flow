import "server-only";

import {
  resolveActiveGym as resolveActiveGymContext,
  selectActiveGym as selectActiveGymContext,
} from "./active-gym";

export type GymContextDto = Readonly<{
  userId: string;
  gymId: string;
  membershipId: string;
}>;

export async function resolveActiveGym(userId: string): Promise<GymContextDto> {
  return toDto(await resolveActiveGymContext(userId));
}

export async function selectActiveGym(
  userId: string,
  gymId: string,
): Promise<GymContextDto> {
  return toDto(await selectActiveGymContext(userId, gymId));
}

function toDto(context: {
  userId: { value: string };
  gymId: { value: string };
  membershipId: { value: string };
}) {
  return {
    userId: context.userId.value,
    gymId: context.gymId.value,
    membershipId: context.membershipId.value,
  };
}
