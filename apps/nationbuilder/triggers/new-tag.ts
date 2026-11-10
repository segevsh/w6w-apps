import type { TriggerDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { readAllPages, snapshotAdded } from "../lib/triggers.ts";

/** Tags carry no timestamps and `/signup_tags` documents no sort, so the whole list is diffed. */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each tag newly defined in the nation.",
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "41", type: "signup_tags", name: "volunteer" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows = await readAllPages(async (pageNumber) => {
      const out = await tagList.execute({ pageSize: 100, pageNumber }, ctx) as {
        items?: Record<string, unknown>[];
      };
      return out.items ?? [];
    }, "new-tag");
    return snapshotAdded(state, rows);
  },
};

export default trigger;
