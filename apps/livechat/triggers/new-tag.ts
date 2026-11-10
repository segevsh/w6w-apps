import type { TriggerDefinition } from "@w6w/types";
import listTags from "../actions/list-tags.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `list_tags` takes the groups to read (`filters.group_ids`, required) and returns their tags in
 * one unpaginated array (https://platform.text.com/docs/management/configuration-api,
 * "List Tags"). A tag is identified by its name, so each check diffs the names against the
 * previous check.
 */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each tag newly created in the chosen LiveChat groups.",
  params: [
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      required: true,
      hint: "Comma-separated group ids to watch; 0 is the default group.",
    },
  ],
  minIntervalMs: 300_000,
  output: [
    { key: "name", type: "string", label: "Tag name" },
    { key: "group_ids", type: "array", label: "Groups the tag belongs to" },
    { key: "author_id", type: "string", label: "Author" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    name: "vip",
    group_ids: [0],
    author_id: "smith@example.com",
    created_at: "2026-11-09T12:01:18.909000Z",
  },
  async poll({ params, state }, ctx) {
    const groupIds = (params as { groupIds?: unknown } | undefined)?.groupIds;
    const out = await listTags.execute({ groupIds }, ctx) as { items: unknown[] };
    return await newRecords(state, out.items, (t) => String((t as { name?: unknown }).name ?? ""));
  },
};

export default trigger;
