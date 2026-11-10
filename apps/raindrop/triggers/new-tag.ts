import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/tag-list.ts";
import { snapshotAdded } from "../lib/triggers.ts";

/** `GET /tags` returns every tag in one response; a tag's name is its identity and it has no timestamp, so the whole set is diffed. */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each tag first used on a bookmark since the last check.",
  output: [
    { key: "_id", type: "string", label: "Tag name" },
    { key: "count", type: "number", label: "Bookmarks using it" },
  ],
  sample: { _id: "reading-list", count: 1 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await action.execute({}, ctx) as { items?: unknown[] };
    return snapshotAdded(state, out.items ?? [], (i) => String(i._id));
  },
};

export default trigger;
