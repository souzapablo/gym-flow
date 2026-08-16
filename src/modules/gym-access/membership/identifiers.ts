import { isUuidV7 } from "@/lib/uuid";

abstract class Identifier {
  readonly value: string;

  protected constructor(value: string, label: string) {
    const normalized = value.trim();

    if (!isUuidV7(normalized)) {
      throw new Error(`${label} must be a UUIDv7`);
    }

    this.value = normalized;
  }

  equals(other: Identifier) {
    return this.constructor === other.constructor && this.value === other.value;
  }

  toString() {
    return this.value;
  }
}

export class UserId extends Identifier {
  constructor(value: string) {
    super(value, "User id");
  }
}

export class GymId extends Identifier {
  constructor(value: string) {
    super(value, "Gym id");
  }
}

export class MembershipId extends Identifier {
  constructor(value: string) {
    super(value, "Membership id");
  }
}
