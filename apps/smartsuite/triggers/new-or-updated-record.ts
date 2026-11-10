import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-records.ts";

interface Item {
  id: string;
  last_updated?: { on?: string };
}

/**
 * Same request as `new-record`, sorted by the system `last_updated` field, newest first
 * (SmartSuite "Sorting and Filtering Records": Last Updated, `lastupdatedfield`, asc/desc).
 * The id carries the update stamp, so an edit is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-record",
  title: "New or Updated Record",
  description: "The run gets each record that is created or edited in the table.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({
    ...params,
    offset: 0,
    limit: 100,
    sort: [{ field: "last_updated", direction: "desc" }],
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const r = item as Item;
    return `${r.id}:${r.last_updated?.on ?? ""}`;
  },
  params: (action.params ?? []).filter((p) => p.key === "tableId"),
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "first_created", type: "object", label: "Created (on, by)" },
    { key: "last_updated", type: "object", label: "Last updated (on, by)" },
  ],
  sample: {
    id: "66f1a2b3c4d5e6f7a8b9c0d1",
    title: "Onboard Acme",
    first_created: { on: "2026-11-08T09:00:00.000000Z", by: "5ec1df770a8617c27a73e3c3" },
    last_updated: { on: "2026-11-09T10:30:00.000000Z", by: "5ec1df770a8617c27a73e3c3" },
  },
  maxPages: 1,
});
