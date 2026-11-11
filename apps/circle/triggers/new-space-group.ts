import type { TriggerDefinition } from "@w6w/types";
import spaceGroupList from "../actions/space-group-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * Space groups are a handful of sidebar groups per community; GET /space_groups has no sort, so
 * every check reads all pages through `space-group-list` and diffs the ids (`pollSnapshot`, added
 * only). https://api-headless.circle.so/api/admin/v2/swagger.yaml (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-space-group",
  title: "New Space Group",
  description: "The run gets each space group newly created in your Circle community.",
  output: [
    { key: "id", type: "number", label: "Space group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 3, name: "Courses", slug: "courses", created_at: "2026-11-09T09:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(spaceGroupList, {}, ctx) });
  },
};

export default trigger;
