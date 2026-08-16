abstract class Identifier {
  readonly value: string;

  protected constructor(value: string, label: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`${label} is required`);
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
