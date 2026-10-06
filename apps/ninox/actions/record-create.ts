import type { ActionDefinition } from "@w6w/types";
import { asRecords, MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/** `POST .../tables/{tableName}/records` — body `{records: [...]}`, 201 `{data: {ids}}`. */
interface Input {
  moduleName: string;
  tableName: string;
  records: Array<Record<string, unknown>> | string;
}

interface Output {
  ids: string[];
}

const recordCreate: ActionDefinition<Input, Output> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Records",
  description: "Create one or more records (up to a 6 MB payload). Each entry maps field names " +
    "to values.",
  idempotent: false,
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: 'JSON array of objects keyed by field name, e.g. [{"name": "Ada", "age": 36}]. ' +
        "Multi fields take an array of strings; any field may be null.",
    },
  ],
  output: [{ key: "ids", type: "array", label: "Created record ids" }],

  async execute(input, ctx) {
    const client = new NinoxClient(ctx);
    const data = await client.data<{ ids?: string[] }>(`${client.tablePath(input)}/records`, {
      method: "POST",
      body: { records: asRecords(input.records) },
    });
    return { ids: data?.ids ?? [] };
  },
};

export default recordCreate;
