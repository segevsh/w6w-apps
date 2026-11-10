import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import dataList from "../actions/data-list.ts";

interface Params {
  type: string;
}

export default pollFromListAction<Params>({
  key: "new-or-updated-thing",
  title: "New or Updated Thing",
  description:
    "The run gets each thing of a Bubble Data Type that is created or edited (sorted by Modified Date, newest first).",
  action: dataList as unknown as ActionDefinition,
  input: (p) => ({
    type: p.type,
    limit: 100,
    sortField: "Modified Date",
    descending: true,
  }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (v) => {
    const t = v as { _id?: unknown; "Modified Date"?: unknown };
    return `${t._id}:${t["Modified Date"]}`;
  },
  params: [{ key: "type", label: "Data type", type: "string", required: true }],
  output: [
    { key: "_id", type: "string", label: "Thing ID" },
    { key: "Created Date", type: "string", label: "Created date" },
    { key: "Modified Date", type: "string", label: "Modified date" },
  ],
  sample: {
    _id: "1700000000000x100000000000000000",
    "Created Date": "2026-11-09T09:00:00.000Z",
    "Modified Date": "2026-11-09T10:30:00.000Z",
  },
  maxPages: 1,
});
