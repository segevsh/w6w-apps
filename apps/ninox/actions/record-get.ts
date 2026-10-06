import type { ActionDefinition } from "@w6w/types";
import { asRecordId, csv, MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/** `GET .../tables/{tableName}/record/{recordId}` — note `record`, singular, unlike the list path. */
interface Input {
  moduleName: string;
  tableName: string;
  recordId: number | string;
  fields?: string;
}

interface Output {
  record: { id: string; values: Record<string, unknown> };
}

const recordGet: ActionDefinition<Input, Output> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Read one record by its id. The record id is not filterable, so this is the only " +
    "way to fetch a known record.",
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    { key: "recordId", label: "Record ID", type: "number", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field names to include. Empty returns every field.",
    },
  ],
  output: [{ key: "record", type: "object", label: "Record ({id, values})" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const record = await client.data<Output["record"]>(
      `${client.tablePath(input)}/record/${asRecordId(input.recordId)}`,
      { query: { fields: csv(input.fields) } },
    );
    return { record };
  },
};

export default recordGet;
