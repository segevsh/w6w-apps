import type { ActionDefinition } from "@w6w/types";
import { asRecords, MODULE_PARAM, NinoxClient, TABLE_PARAM } from "../lib/client.ts";

/**
 * `POST .../tables/{tableName}/records/upsert` — match on one field marked `unique: true`.
 * An ambiguous match is a 409, never resolved silently.
 */
interface Input {
  moduleName: string;
  tableName: string;
  matchField: string;
  records: Array<Record<string, unknown>> | string;
}

interface Output {
  createdIds: string[];
  updatedIds: string[];
}

const recordUpsert: ActionDefinition<Input, Output> = {
  key: "record-upsert",
  type: "perform",
  resource: "record",
  title: "Upsert Records",
  description: "Create or update records matched by one unique field. Every record must carry a " +
    "value for the match field.",
  idempotent: true,
  params: [
    MODULE_PARAM,
    TABLE_PARAM,
    {
      key: "matchField",
      label: "Match field",
      type: "string",
      required: true,
      placeholder: "email",
      hint: "A field on the table marked unique.",
    },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: 'JSON array of objects, e.g. [{"email": "ada@example.com", "name": "Ada"}].',
    },
  ],
  output: [
    { key: "createdIds", type: "array", label: "Created record ids" },
    { key: "updatedIds", type: "array", label: "Updated record ids" },
  ],

  async execute(input, ctx) {
    const matchField = String(input.matchField ?? "").trim();
    if (!matchField) throw new Error("matchField is required");
    const records = asRecords(input.records);
    for (const r of records) {
      if (r[matchField] === undefined || r[matchField] === null) {
        throw new Error(`every entry of records needs a value for the match field "${matchField}"`);
      }
    }
    const client = new NinoxClient(ctx);
    const data = await client.data<{ createdIds?: string[]; updatedIds?: string[] }>(
      `${client.tablePath(input)}/records/upsert`,
      { method: "POST", body: { matchField, records } },
    );
    return { createdIds: data?.createdIds ?? [], updatedIds: data?.updatedIds ?? [] };
  },
};

export default recordUpsert;
