"use client";

import { useState, useTransition } from "react";

import type { MembershipDto } from "@/modules/gym-access";

type GymSelectorProps = {
  memberships: MembershipDto[];
  selectGymAction: (gymId: string) => Promise<void>;
};

export function GymSelector({
  memberships,
  selectGymAction,
}: GymSelectorProps) {
  const [gymId, setGymId] = useState(memberships[0]?.gymId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectGym() {
    setMessage(null);
    startTransition(async () => {
      try {
        await selectGymAction(gymId);
        setMessage("Academia selecionada.");
      } catch {
        setMessage("Não foi possível selecionar esta academia.");
      }
    });
  }

  return (
    <main className="desk">
      <section
        className="sheet gym-selector"
        aria-labelledby="gym-selector-title"
      >
        <h1 id="gym-selector-title">Escolha uma academia</h1>
        <p>Selecione onde você quer treinar agora.</p>
        <label htmlFor="active-gym">Academia</label>
        <select
          id="active-gym"
          value={gymId}
          disabled={pending}
          onChange={(event) => setGymId(event.target.value)}
        >
          {memberships.map((membership) => (
            <option key={membership.id} value={membership.gymId}>
              {membership.gymName}
            </option>
          ))}
        </select>
        <button type="button" disabled={pending || !gymId} onClick={selectGym}>
          {pending ? "Selecionando…" : "Continuar"}
        </button>
        <p aria-live="polite">{message}</p>
      </section>
    </main>
  );
}
