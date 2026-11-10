import type { TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "../lib/window.ts";
import action from "../actions/person-list.ts";

export const OVERLAP_MS = 120_000;
/** Pages read per check; a longer window is resumed on the next check (brief 9.8). */
export const MAX_PAGES = 40;
const PAGE_SIZE = 25;
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
      const idOf = (item: unknown) => {
        const person = item as { id?: unknown; modified_date?: unknown };
        const id = String(person.id ?? "");
        return field === "modified_date" ? `${id}:${String(person.modified_date ?? "")}` : id;
      };
      return await pollWindow<unknown, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: 5000,
        idOf,
        tsOf: (item) => toMs((item as Record<string, unknown>)[field]),
        async load(since, pos) {
          const page = pos ?? 1;
          const filter = `${field} gt '${new Date(since).toISOString()}'`;
          const result = await action.execute({ filter, page, perPage: PAGE_SIZE }, ctx) as {
            items?: unknown[];
            hasMore?: boolean;
          };
          return { items: result.items ?? [], next: result.hasMore ? page + 1 : undefined };
        },
      });
    },
  };
}

export default personTrigger("new-person", "New Person", "created_date");
export const newOrUpdatedPerson = personTrigger(
  "new-or-updated-person",
  "New or Updated Person",
  "modified_date",
);
