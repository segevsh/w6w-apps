import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import dataList from "../actions/data-list.ts";

interface Params {
  type: string;
}

export default pollFromListAction<Params>({
  key: "new-thing",
  title: "New Thing",
  description:
    "The run gets each newly created thing of a Bubble Data Type (sorted by Created Date, newest first).",
  action: dataList as unknown as ActionDefinition,
  input: (p) => ({
    type: p.type,
    limit: 100,
    sortField: "Created Date",
    descending: true,
  }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (v) => String((v as { _id?: unknown })._id ?? ""),
  params: [{ key: "type", label: "Data type", type: "string", required: true }],
  output: [
    { key: "_id", type: "string", label: "Thing ID" },
    { key: "Created Date", type: "string", label: "Created date" },
    { key: "Modified Date", type: "string", label: "Modified date" },
    { key: "Created By", type: "string", label: "Created by (user ID)" },
  ],
  sample: {
    _id: "1700000000000x100000000000000000",
    "Created Date": "2026-11-09T09:00:00.000Z",
    "Modified Date": "2026-11-09T09:00:00.000Z",
    "Created By": "1699999999999x200000000000000000",
  },
  maxPages: 1,
});
