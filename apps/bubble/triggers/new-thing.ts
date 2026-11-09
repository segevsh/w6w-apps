import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import dataList from "../actions/data-list.ts";

export default pollFromListAction({
  key: "new-thing",
  title: "New Thing",
  description: "The run gets each newly created Bubble thing.",
  action: dataList as unknown as ActionDefinition,
  input: (p: { type: string }) => ({
    type: p.type,
    limit: 100,
    cursor: 0,
    sortField: "Created Date",
    descending: true,
  }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (v) =>
    String((v as { _id?: unknown; id?: unknown })._id ?? (v as { id?: unknown }).id ?? ""),
  params: [{ key: "type", label: "Data type", type: "string", required: true }],
  output: [{ key: "_id", type: "string", label: "Thing ID" }],
  sample: { _id: "thing-1" },
  maxPages: 1,
});
