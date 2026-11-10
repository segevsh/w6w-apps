import type { TriggerDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `GET /tags` is a small collection read in full through `tag-list` (`returnAll`, `start`/`limit`
 * paging; https://devdocs.mautic.org/en/7.1/rest_api/tags.html, 2026-11-10); a check diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each tag that appears in Mautic.",
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "tag", type: "string", label: "Tag" },
  ],
  sample: { "id": 12, "tag": "vip" },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => newRecords({ state, action: tagList, ctx }),
};

export default trigger;
