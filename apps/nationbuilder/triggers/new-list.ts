import type { TriggerDefinition } from "@w6w/types";
import listList from "../actions/list-list.ts";
import { readAllPages, snapshotAdded } from "../lib/triggers.ts";

/** `/lists` documents no sort; a nation's custom lists are few, so the whole list is diffed. */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "The run gets each custom list newly created in the nation.",
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "21",
    type: "lists",
    name: "Door knockers",
    slug: "door_knockers",
    created_at: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows = await readAllPages(async (pageNumber) => {
      const out = await listList.execute({ pageSize: 100, pageNumber }, ctx) as {
        items?: Record<string, unknown>[];
      };
      return out.items ?? [];
    }, "new-list");
    return snapshotAdded(state, rows);
  },
};

export default trigger;
