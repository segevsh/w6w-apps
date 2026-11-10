import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import action from "../actions/person-list.ts";

export const OVERLAP_MS = 120_000;
export const clock = { now: (): number => Date.now() };

function personTrigger(
  key: string,
  title: string,
  field: "created_date" | "modified_date",
): TriggerDefinition {
  return {
    key,
    title,
    description: `Emits people whose ${field} is after the previous successful check.`,
    params: [],
    output: [{ key: "id", type: "string", label: "Person ID" }],
    sample: { id: "person-101" },
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const checkedAt = clock.now();
      const cursor = typeof (state as { cursor?: unknown })?.cursor === "number"
        ? (state as { cursor: number }).cursor
        : checkedAt;
      const filter = `${field} gt '${new Date(cursor - OVERLAP_MS).toISOString()}'`;
      const idOf = (item: unknown) => {
        const person = item as { id?: unknown; modified_date?: unknown };
        const id = String(person.id ?? "");
        return field === "modified_date" ? `${id}:${String(person.modified_date ?? "")}` : id;
      };
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        maxEvents: 2500,
        seenWindow: 5000,
        idOf,
        async fetchPage() {
          const items: unknown[] = [];
          for (let page = 1; page <= 100; page++) {
            const result = await action.execute({ filter, page, perPage: 25 }, ctx) as {
              items?: unknown[];
              hasMore?: boolean;
            };
            items.push(...(result.items ?? []));
            if (!result.hasMore) break;
          }
          return { items };
        },
      });
      return { events, nextState: { ...nextState, cursor: checkedAt } };
    },
  };
}

export default personTrigger("new-person", "New Person", "created_date");
export const newOrUpdatedPerson = personTrigger(
  "new-or-updated-person",
  "New or Updated Person",
  "modified_date",
);
