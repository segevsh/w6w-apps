import type { OutputField, TriggerDefinition } from "@w6w/types";
import { SNAPSHOT_OUTPUT, snapshotPoll } from "../lib/triggers.ts";
import tagList from "../actions/tag-list.ts";

/**
 * `GET /tags` (the `tag-list` action), read page by page and diffed: the Network's tags are
 * a small bounded collection and the Admin API documents no sort order or since filter on the list.
 * Docs (verified 2026-11-10): https://docs.mightynetworks.com/llms.txt (Admin API v1 / Tags)
 */
const newTag: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description:
    "The run gets each tag newly created in your Network (no webhook event announces a new tag): the tag (id, title, description, color).",
  output: SNAPSHOT_OUTPUT as OutputField[],
  sample: {
    change: "added",
    key: "777",
    values: { id: 777, title: "VIP", description: "Top members", color: "#ff8800" },
  },
  minIntervalMs: 3_600_000,
  poll({ state }, ctx) {
    return snapshotPoll({
      state,
      label: "tags",
      fetchPage: (page, perPage) => tagList.execute({ page, perPage }, ctx),
    });
  },
};

export default newTag;
