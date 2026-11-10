import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { allLists } from "../lib/triggers.ts";

/**
 * Small bounded collection: `GET /lists` is cursor-paginated at 100 per page and an account holds a
 * handful of lists. All pages (at most ten) are diffed each check; an account beyond that cap makes
 * the check fail with an error naming the cap rather than silently losing lists.
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "Runs when a list is created in the EmailOctopus account.",
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "List name" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],
  sample: {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Newsletter",
    created_at: "2026-11-09T12:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const lists = await allLists(ctx);
    const { events, nextState } = await pollSnapshot({
      state,
      rows: lists.map((list) => ({
        key: String((list as { id?: unknown }).id ?? ""),
        values: list,
      })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
