import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GymSelector } from "./gym-selector";

const memberships = [
  {
    id: "71000000-0000-7000-8000-000000000001",
    gymId: "72000000-0000-7000-8000-000000000001",
    gymName: "Academia A",
    role: "owner",
    status: "active",
  },
  {
    id: "71000000-0000-7000-8000-000000000002",
    gymId: "72000000-0000-7000-8000-000000000002",
    gymName: "Academia B",
    role: "coach",
    status: "active",
  },
];

describe("GymSelector", () => {
  it("renders active memberships and submits the selected gym", async () => {
    const user = userEvent.setup();
    const selectGymAction = vi.fn().mockResolvedValue(undefined);
    render(
      <GymSelector
        memberships={memberships}
        selectGymAction={selectGymAction}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Academia"),
      "72000000-0000-7000-8000-000000000002",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(selectGymAction).toHaveBeenCalledWith(
      "72000000-0000-7000-8000-000000000002",
    );
    expect((await screen.findByText("Academia selecionada.")).textContent).toBe(
      "Academia selecionada.",
    );
  });

  it("shows pending state and prevents another submission", async () => {
    const user = userEvent.setup();
    let resolveSelection!: () => void;
    const selectGymAction = vi.fn(
      () => new Promise<void>((resolve) => (resolveSelection = resolve)),
    );
    render(
      <GymSelector
        memberships={memberships}
        selectGymAction={selectGymAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen
        .getByRole("button", { name: "Selecionando…" })
        .hasAttribute("disabled"),
    ).toBe(true);
    resolveSelection();
    expect((await screen.findByText("Academia selecionada.")).textContent).toBe(
      "Academia selecionada.",
    );
  });

  it("uses the same non-disclosing message for forbidden or stale selections", async () => {
    const user = userEvent.setup();
    const selectGymAction = vi
      .fn()
      .mockRejectedValue(new Error("Gym access is forbidden"));
    render(
      <GymSelector
        memberships={memberships}
        selectGymAction={selectGymAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      (await screen.findByText("Não foi possível selecionar esta academia."))
        .textContent,
    ).toBe("Não foi possível selecionar esta academia.");
  });
});
