import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import action from "../actions/candidate-list.ts";

export const OVERLAP_MS = 120_000;
export const clock = { now: (): number => Date.now() };

const trigger: TriggerDefinition = {
  key: "new-candidate",
  title: "New Candidate",
  description: "Emits candidates created since the previous successful check.",
  params: [],
  output: [{ key: "id", type: "string", label: "Candidate ID" }],
  sample: { id: "cand-101" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const checkedAt = clock.now();
    const cursor = typeof (state as { cursor?: unknown })?.cursor === "number"
      ? (state as { cursor: number }).cursor
      : checkedAt;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 400,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      async fetchPage() {
        const result = await action.execute({
          createdAfter: new Date(cursor - OVERLAP_MS).toISOString(),
          limit: 100,
          maxPages: 1,
        }, ctx) as { candidates?: unknown[] };
        return { items: result.candidates ?? [] };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
};

export default trigger;
