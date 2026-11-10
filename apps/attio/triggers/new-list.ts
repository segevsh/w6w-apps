import type { TriggerDefinition } from "@w6w/types";
import listLists from "../actions/list-lists.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /v2/lists` takes no parameters and returns every list the token can see — a small bounded
 * collection in sidebar order, which is not a sort key
 * (https://docs.attio.com/rest-api/endpoint-reference/lists/list-all-lists, 2026-11-10). Every check
 * reads it through `list-lists` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "The run gets each list that newly becomes visible to the connected Attio token.",
  output: [
    { key: "id", type: "object", label: "List ID ({ workspace_id, list_id })" },
    { key: "api_slug", type: "string", label: "API slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "parent_object", type: "array", label: "Objects the list holds records of" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: { workspace_id: "w_1", list_id: "l_1" },
    api_slug: "sales",
    name: "Sales",
    parent_object: ["people"],
    created_at: "2026-11-09T10:00:00.000000000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await listLists.execute({}, ctx) as { records?: unknown[] };
    return newRecords({
      state,
      items: res.records ?? [],
      idOf: (l) => (l as { id?: { list_id?: unknown } }).id?.list_id,
    });
  },
};

export default trigger;
