import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import action from "../actions/lead-list.ts";

export const OVERLAP_MS = 86_400_000;
export const clock = { now: (): number => Date.now() };

const trigger: TriggerDefinition = {
  key: "new-lead",
  title: "New Lead",
  description: "Emits leads created since the previous successful check.",
  params: [],
  output: [{ key: "id", type: "number", label: "Lead ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const checkedAt = clock.now();
    const cursor = typeof (state as { cursor?: unknown })?.cursor === "number"
      ? (state as { cursor: number }).cursor
      : checkedAt;
    const startDate = new Date(cursor - OVERLAP_MS).toISOString().slice(0, 10);
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      maxEvents: 100,
      seenWindow: 400,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      async fetchPage() {
        const items: unknown[] = [];
        for (let page = 1; page <= 100; page++) {
          const result = await action.execute({ startDate, page, pageSize: 100 }, ctx) as {
            leads?: unknown[];
            totalCount?: number;
          };
          const leads = result.leads ?? [];
          items.push(...leads);
          if (leads.length < 100 || page * 100 >= Number(result.totalCount ?? 0)) break;
        }
        return { items };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
};

export default trigger;
