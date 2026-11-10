import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listLists from "../actions/list-lists.ts";

/**
 * Small bounded collection: `GET /api/lists` returns every contact list of the account in one
 * unpaginated response (a handful of lists, far below the snapshot cap), so the whole set is
 * diffed on each check and only additions are emitted.
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New Contact List",
  description: "The run gets each newly created Findymail contact list.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "name", type: "string", label: "List name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "shared_with_team", type: "boolean", label: "Shared with team" },
  ],
  sample: {
    id: 1,
    name: "my list",
    created_at: "2026-11-09T12:00:00.000000Z",
    updated_at: "2026-11-09T12:00:00.000000Z",
    shared_with_team: false,
    is_owner: true,
  },
  async poll({ state }, ctx: HookContext) {
    const result = await listLists.execute({}, ctx) as { lists?: Array<{ id?: unknown }> };
    const lists = Array.isArray(result?.lists) ? result.lists : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: lists.map((list) => ({ key: String(list.id ?? ""), values: list })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
