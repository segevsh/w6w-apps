import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import searchRecords from "../actions/search-records.ts";

interface Params {
  baseId: string;
  table: string;
  lastModifiedField: string;
  filterByFormula?: string;
  view?: string;
}

interface AirtableRecord {
  id?: unknown;
  fields?: Record<string, unknown>;
}

/** `recId:<last modified time>`, so an edited record is a new event. */
export function versionId(record: unknown, field: string): string {
  const r = record as AirtableRecord;
  if (typeof r?.id !== "string" || r.id === "") {
    throw new Error("Airtable list records returned a record without id");
  }
  const stamp = r.fields?.[field];
  return `${r.id}:${typeof stamp === "string" ? stamp : ""}`;
}

/**
 * Same list-records request as `new-record`, sorted descending by a Last modified time field (the
 * documented `sort` parameter), deduplicated on `id:<last modified time>`.
 */
const newOrUpdatedRecord: TriggerDefinition<Params> = {
  key: "new-or-updated-record",
  title: "New or Updated Record",
  description:
    "Fires when an Airtable record matching the selected table and filter is created or edited. The run gets the record's id, created time and fields.",
  minIntervalMs: 300_000,
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true },
    { key: "table", label: "Table name or ID", type: "string", required: true },
    {
      key: "lastModifiedField",
      label: "Last-modified-time field",
      type: "string",
      required: true,
      placeholder: "Last Modified",
      hint:
        "Choose a Last modified time field. The trigger sorts it descending to read the most recently edited records first.",
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
    fields: { Name: "Ada Lovelace", "Last Modified": "2026-11-10T08:30:00.000Z" },
  },
  async poll({ params, state }, ctx) {
    const action = searchRecords as unknown as ActionDefinition;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      fetchPage: async () => {
        const result = await action.execute({
          baseId: params.baseId,
          table: params.table,
          filterByFormula: params.filterByFormula,
          view: params.view,
          sort: [{ field: params.lastModifiedField, direction: "desc" }],
          pageSize: 100,
        }, ctx) as { records?: unknown[] };
        return { items: result.records ?? [] };
      },
      idOf: (record) => versionId(record, params.lastModifiedField),
    });
    return { events, nextState };
  },
};

export default newOrUpdatedRecord;
