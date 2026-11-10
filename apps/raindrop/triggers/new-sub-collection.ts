import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/collection-children-list.ts";
import { snapshotAdded } from "../lib/triggers.ts";

/** `GET /collections/childrens` returns every nested collection in one response (no paging, no documented order), so the whole set is diffed. */
const trigger: TriggerDefinition = {
  key: "new-sub-collection",
  title: "New Sub-Collection",
  description:
    "The run gets each nested collection (one with a parent) created since the last check.",
  output: [
    { key: "_id", type: "number", label: "Collection ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { _id: 77, title: "Recipes", parent: { $id: 42 } },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await action.execute({}, ctx) as { items?: unknown[] };
    return snapshotAdded(state, out.items ?? [], (i) => String(i._id));
  },
};

export default trigger;
