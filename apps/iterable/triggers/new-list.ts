import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listLists from "../actions/list-lists.ts";

/**
 * `GET /api/lists` returns every list of the project in one unpaginated response
 * (https://api.iterable.com/api-docs, "Get lists"), so each check diffs the list ids against the
 * previous check (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "The run gets each newly created list.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "listType", type: "string", label: "List type" },
    { key: "createdAt", type: "number", label: "Created at" },
  ],
  sample: { id: 7, name: "Newsletter", listType: "Standard", createdAt: 1762768800000 },
  async poll({ state }, ctx) {
    const out = await listLists.execute({}, ctx) as { lists?: Array<{ id?: unknown }> };
    const lists = out.lists ?? [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: lists.map((l) => ({ key: String(l.id ?? ""), values: { id: l.id } })),
      emit: { added: true, updated: false },
    });
    const byKey = new Map(lists.map((l) => [String(l.id ?? ""), l]));
    return { events: events.map((e) => byKey.get(e.key)), nextState };
  },
};

export default trigger;
