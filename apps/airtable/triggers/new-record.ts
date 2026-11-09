import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import searchRecords from "../actions/search-records.ts";

interface Params {
  baseId: string;
  table: string;
  createdTimeField: string;
  filterByFormula?: string;
  view?: string;
}

function recordId(record: unknown): string {
  const id = (record as { id?: unknown }).id;
  if (typeof id !== "string" || !id) {
    throw new Error("Airtable list records returned a record without id");
  }
  return id;
}

export default pollFromListAction<Params>({
  key: "new-record",
  title: "New Record",
  description: "Fires when a newly created Airtable record matches the selected table and filter.",
  action: searchRecords as unknown as ActionDefinition,
  input: (params) => ({
    baseId: params.baseId,
    table: params.table,
    filterByFormula: params.filterByFormula,
    view: params.view,
    sort: [{ field: params.createdTimeField, direction: "desc" }],
    pageSize: 100,
  }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: recordId,
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true },
    { key: "table", label: "Table name or ID", type: "string", required: true },
    {
      key: "createdTimeField",
      label: "Created-time field",
      type: "string",
      required: true,
      placeholder: "Created",
      hint:
        "Choose a Created time field. The trigger sorts it descending to read newest records first.",
    },
    { key: "filterByFormula", label: "Filter formula", type: "string" },
    { key: "view", label: "View name or ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "createdTime", type: "string", label: "Created time" },
    { key: "fields", type: "object", label: "Fields" },
  ],
  sample: {
    id: "recA1B2C3",
    createdTime: "2026-11-09T12:00:00.000Z",
    fields: { Name: "Ada Lovelace" },
  },
});
