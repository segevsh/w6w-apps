import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/search-space.ts";

/**
 * `POST /search/space/{space_id}/` is documented as ordered "descending by the time the object had
 * any update" and capped at 20 hits per call, so page one is always the freshest 20.
 */
export default pollFromListAction<{ spaceId: string; query: string; refType?: string }>({
  key: "new-search-hit",
  title: "New Search Match",
  description:
    "The run gets each item, task or status in the chosen workspace that newly appears among the 20 most recently updated matches for your search text.",
  action: action as unknown as ActionDefinition,
  params: [
    {
      key: "spaceId",
      label: "Workspace (Space) ID",
      type: "string",
      required: true,
      hint: "Numeric space id.",
    },
    { key: "query", label: "Search text", type: "string", required: true },
    {
      key: "refType",
      label: "Result type",
      type: "select",
      options: ["item", "task", "status", "app", "file", "conversation", "profile"].map((v) => ({
        value: v,
        label: v,
      })),
      hint: "Only this kind of object. Leave empty for all.",
    },
  ],
  input: ({ spaceId, query, refType }) => ({ spaceId, query, refType, limit: 20, offset: 0 }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (x) => {
    const hit = x as { type?: unknown; id?: unknown };
    if (hit.id === undefined || hit.id === null) throw new Error("new-search-hit: hit has no id");
    return `${String(hit.type ?? "")}:${String(hit.id)}`;
  },
  output: [
    { key: "type", type: "string", label: "Object type" },
    { key: "id", type: "number", label: "Object ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "link", type: "string", label: "Link" },
  ],
  sample: {
    type: "item",
    id: 4012345,
    title: "Acme renewal",
    link: "https://podio.com/acme/sales/apps/leads/items/12",
  },
  maxPages: 1,
}) as TriggerDefinition;
